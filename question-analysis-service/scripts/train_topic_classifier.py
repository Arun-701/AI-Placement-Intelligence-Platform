import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DATASET_PATH = BACKEND_DIR / "data" / "question_topic_dataset_1500.csv"
MODEL_STORAGE_PATH = BACKEND_DIR / "models" / "topic_classifier"
MODEL_STORAGE_PATH.mkdir(parents=True, exist_ok=True)

REQUIRED_COLUMNS = ["question", "domain", "topic"]


def sanitize_filename(value):
    safe_value = re.sub(r"[^A-Za-z0-9]+", "_", str(value).strip())
    safe_value = re.sub(r"_+", "_", safe_value).strip("_").lower()
    return safe_value or "unknown"


def load_data():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

    data = pd.read_csv(DATASET_PATH)

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in data.columns]
    if missing_columns:
        raise ValueError(f"Dataset is missing required columns: {missing_columns}")

    if data[REQUIRED_COLUMNS].isnull().values.any():
        raise ValueError("Dataset contains missing values.")

    if data.duplicated(subset="question").any():
        raise ValueError("Dataset contains duplicate questions.")

    return data


def generate_embeddings(questions):
    model = SentenceTransformer("all-MiniLM-L6-v2")
    return model.encode(questions, show_progress_bar=False)


def build_classifier_models():
    return {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "SVM": SVC(probability=True),
        "Random Forest": RandomForestClassifier(random_state=42),
    }


def evaluate_model(classifier, X_test, y_test):
    predictions = classifier.predict(X_test)

    return {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, average="weighted", zero_division=0)),
        "recall": float(recall_score(y_test, predictions, average="weighted", zero_division=0)),
        "f1": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
    }


def select_best_model(model_metrics):
    best_name = None
    best_metrics = None

    for model_name, metrics in model_metrics.items():
        if best_name is None:
            best_name = model_name
            best_metrics = metrics
            continue

        if metrics["f1"] > best_metrics["f1"] or (
            metrics["f1"] == best_metrics["f1"] and metrics["accuracy"] > best_metrics["accuracy"]
        ):
            best_name = model_name
            best_metrics = metrics

    return best_name, best_metrics


def train_and_evaluate_domain_models(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    classifiers = build_classifier_models()
    model_metrics = {}

    for model_name, classifier in classifiers.items():
        classifier.fit(X_train, y_train)
        model_metrics[model_name] = evaluate_model(classifier, X_test, y_test)

        print(
            f"Model: {model_name}, Accuracy: {model_metrics[model_name]['accuracy']:.4f}, "
            f"Precision: {model_metrics[model_name]['precision']:.4f}, "
            f"Recall: {model_metrics[model_name]['recall']:.4f}, "
            f"F1: {model_metrics[model_name]['f1']:.4f}"
        )

    best_model_name, best_model_metrics = select_best_model(model_metrics)
    print(f"Best Domain Model: {best_model_name}")

    selected_model = classifiers[best_model_name]
    return selected_model, best_model_name, best_model_metrics, model_metrics


def train_and_evaluate_topic_models(data, embeddings):
    successful_topic_models = {}
    topic_evaluations = {}
    topic_model_map = {}

    print("\n===== TOPIC CLASSIFICATION =====")

    for domain_name in data["domain"].drop_duplicates().tolist():
        domain_mask = data["domain"] == domain_name
        domain_embeddings = embeddings[domain_mask.to_numpy()]
        domain_topics = data.loc[domain_mask, "topic"].tolist()

        if len(domain_topics) == 0:
            print(f"--- {domain_name} ---")
            print(f"Warning: Domain '{domain_name}' has no rows. Skipping.")
            continue

        class_counts = pd.Series(domain_topics).value_counts()
        min_class_count = class_counts.min()

        if min_class_count < 2:
            print(f"--- {domain_name} ---")
            print(
                f"Warning: Domain '{domain_name}' does not have enough topic samples for a safe stratified split. "
                f"Minimum class count: {min_class_count}. Skipping."
            )
            continue

        X_train, X_test, y_train, y_test = train_test_split(
            domain_embeddings,
            domain_topics,
            test_size=0.2,
            random_state=42,
            stratify=domain_topics,
        )

        classifiers = build_classifier_models()
        model_metrics = {}

        print(f"\n--- {domain_name} ---")
        for model_name, classifier in classifiers.items():
            classifier.fit(X_train, y_train)
            model_metrics[model_name] = evaluate_model(classifier, X_test, y_test)

            print(
                f"Model: {model_name}, Accuracy: {model_metrics[model_name]['accuracy']:.4f}, "
                f"Precision: {model_metrics[model_name]['precision']:.4f}, "
                f"Recall: {model_metrics[model_name]['recall']:.4f}, "
                f"F1: {model_metrics[model_name]['f1']:.4f}"
            )

        best_model_name, best_model_metrics = select_best_model(model_metrics)
        print(f"Best Topic Model for {domain_name}: {best_model_name}")

        successful_topic_models[domain_name] = classifiers[best_model_name]
        topic_model_map[domain_name] = {
            "model_name": best_model_name,
            "metrics": best_model_metrics,
            "all_metrics": model_metrics,
        }
        topic_evaluations[domain_name] = {
            "all_metrics": model_metrics,
            "best_model": best_model_name,
            "best_metrics": best_model_metrics,
        }

    return successful_topic_models, topic_model_map, topic_evaluations


def save_model_artifacts(best_domain_model, best_domain_name, model_metrics, topic_models, topic_model_map):
    domain_model_filename = "best_domain_classifier.joblib"
    domain_model_path = MODEL_STORAGE_PATH / domain_model_filename
    joblib.dump(best_domain_model, domain_model_path)

    topic_files = {}
    for domain_name, model in topic_models.items():
        safe_domain = sanitize_filename(domain_name)
        topic_filename = f"topic_classifier_{safe_domain}.joblib"
        topic_path = MODEL_STORAGE_PATH / topic_filename
        joblib.dump(model, topic_path)
        topic_files[domain_name] = {
            "filename": topic_filename,
            "path": str(topic_path),
            "model_name": topic_model_map[domain_name]["model_name"],
            "metrics": topic_model_map[domain_name]["metrics"],
        }

    metadata = {
        "selected_domain_model": {
            "model_name": best_domain_name,
            "filename": domain_model_filename,
            "path": str(domain_model_path),
            "metrics": model_metrics[best_domain_name],
        },
        "domain_model_names": list(model_metrics.keys()),
        "topic_models": topic_files,
        "domain_to_topic_model": {domain_name: topic_files[domain_name]["filename"] for domain_name in topic_files},
        "evaluation_metrics": {
            "domain": {
                "all_metrics": model_metrics,
                "best_model": best_domain_name,
                "best_metrics": model_metrics[best_domain_name],
            },
            "topic": {domain_name: topic_model_map[domain_name] for domain_name in topic_model_map},
        },
    }

    metadata_path = MODEL_STORAGE_PATH / "classifier_metadata.json"
    with metadata_path.open("w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, indent=2, ensure_ascii=False)

    report_path = MODEL_STORAGE_PATH / "training_evaluation_report.json"
    report = {
        "domain_classification": {
            "all_metrics": model_metrics,
            "best_model": best_domain_name,
            "best_metrics": model_metrics[best_domain_name],
        },
        "topic_classification": {
            domain_name: topic_model_map[domain_name] for domain_name in topic_model_map
        },
    }
    with report_path.open("w", encoding="utf-8") as report_file:
        json.dump(report, report_file, indent=2, ensure_ascii=False)

    return metadata_path, report_path


def main():
    data = load_data()
    questions = data["question"].tolist()
    domains = data["domain"].tolist()
    embeddings = generate_embeddings(questions)

    print("\n===== DOMAIN CLASSIFICATION =====")
    best_domain_model, best_domain_name, best_domain_metrics, domain_model_metrics = train_and_evaluate_domain_models(
        embeddings, domains
    )

    topic_models, topic_model_map, topic_evaluations = train_and_evaluate_topic_models(data, embeddings)

    metadata_path, report_path = save_model_artifacts(
        best_domain_model,
        best_domain_name,
        domain_model_metrics,
        topic_models,
        topic_model_map,
    )

    print("\n===== TRAINING SUMMARY =====")
    print(f"Questions: {len(data)}")
    print(f"Domains: {data['domain'].nunique()}")
    print(f"Topics: {data['topic'].nunique()}")
    print(f"Best Domain Model: {best_domain_name}")
    print(f"Successfully trained topic models: {len(topic_models)}")
    print(f"Model storage: {MODEL_STORAGE_PATH}")
    print(f"Metadata: {metadata_path}")
    print(f"Evaluation report: {report_path}")


if __name__ == "__main__":
    main()
