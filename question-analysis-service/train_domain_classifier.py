import os
import json
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score
)

from sentence_transformers import SentenceTransformer


# ============================================================
# CONFIG
# ============================================================

DATASET_PATH = "data/placement_question_dataset_3500.csv"

MODEL_DIR = "models/topic_classifier"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "best_domain_classifier.joblib"
)

EMBEDDING_MODEL = "all-MiniLM-L6-v2"

RANDOM_STATE = 42


# ============================================================
# LOAD DATASET
# ============================================================

print("\n========================================")
print("LOADING DATASET")
print("========================================")

df = pd.read_csv(DATASET_PATH)

print("Rows:", len(df))
print("Columns:", list(df.columns))

print("\nDomain distribution:")
print(df["domain"].value_counts())


# ============================================================
# VALIDATE
# ============================================================

required_columns = ["question", "domain", "topic"]

if list(df.columns) != required_columns:
    raise ValueError(
        f"Expected columns {required_columns}, "
        f"but found {list(df.columns)}"
    )

if len(df) != 3500:
    raise ValueError(
        f"Expected 3500 rows, found {len(df)}"
    )

expected_domains = {
    "Aptitude",
    "Coding",
    "OOP",
    "DSA",
    "DBMS",
    "Computer Networks",
    "Operating Systems"
}

actual_domains = set(df["domain"].unique())

if actual_domains != expected_domains:
    raise ValueError(
        f"Domain mismatch.\n"
        f"Expected: {expected_domains}\n"
        f"Found: {actual_domains}"
    )

domain_counts = df["domain"].value_counts()

for domain in expected_domains:

    if domain_counts[domain] != 500:

        raise ValueError(
            f"{domain} has {domain_counts[domain]} questions"
        )

if df.isna().sum().sum() != 0:
    raise ValueError("Dataset contains null values.")

if (
    df["question"]
    .astype(str)
    .str.strip()
    .str.lower()
    .duplicated()
    .sum()
    != 0
):
    raise ValueError("Dataset contains duplicate questions.")


print("\nDataset validation PASSED.")


# ============================================================
# TEXT + LABELS
# ============================================================

X = df["question"].astype(str).values
y = df["domain"].astype(str).values


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

print("\n========================================")
print("CREATING TRAIN / TEST SPLIT")
print("========================================")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=RANDOM_STATE,
    stratify=y
)

print("Training questions:", len(X_train))
print("Testing questions:", len(X_test))


# ============================================================
# LOAD SENTENCE TRANSFORMER
# ============================================================

print("\n========================================")
print("LOADING EMBEDDING MODEL")
print("========================================")

print("Model:", EMBEDDING_MODEL)

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL
)


# ============================================================
# CREATE EMBEDDINGS
# ============================================================

print("\n========================================")
print("CREATING TRAIN EMBEDDINGS")
print("========================================")

X_train_embeddings = embedding_model.encode(
    X_train,
    show_progress_bar=True,
    normalize_embeddings=True
)

print("\nTrain embedding shape:")
print(X_train_embeddings.shape)


print("\n========================================")
print("CREATING TEST EMBEDDINGS")
print("========================================")

X_test_embeddings = embedding_model.encode(
    X_test,
    show_progress_bar=True,
    normalize_embeddings=True
)

print("\nTest embedding shape:")
print(X_test_embeddings.shape)


# ============================================================
# TRAIN SVM
# ============================================================

print("\n========================================")
print("TRAINING SVM DOMAIN CLASSIFIER")
print("========================================")

classifier = SVC(
    kernel="linear",
    C=1.0,
    probability=True,
    class_weight="balanced",
    random_state=RANDOM_STATE
)

classifier.fit(
    X_train_embeddings,
    y_train
)

print("Training completed.")


# ============================================================
# PREDICTION
# ============================================================

print("\n========================================")
print("EVALUATING MODEL")
print("========================================")

y_pred = classifier.predict(
    X_test_embeddings
)


# ============================================================
# METRICS
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

macro_f1 = f1_score(
    y_test,
    y_pred,
    average="macro"
)

print("\n========================================")
print("RESULTS")
print("========================================")

print(f"Accuracy : {accuracy:.4f}")
print(f"Macro F1 : {macro_f1:.4f}")


print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        y_pred,
        digits=4
    )
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

labels = sorted(expected_domains)

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=labels
)

print("\n========================================")
print("CONFUSION MATRIX")
print("========================================")

print("Labels:")
print(labels)

print()

print(cm)


# ============================================================
# SAVE MODEL
# ============================================================

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    classifier,
    MODEL_PATH
)

print("\n========================================")
print("MODEL SAVED")
print("========================================")

print(MODEL_PATH)


# ============================================================
# SAVE METADATA
# ============================================================

metadata = {

    "model_type": "SVM",

    "embedding_model": EMBEDDING_MODEL,

    "kernel": "linear",

    "C": 1.0,

    "class_weight": "balanced",

    "random_state": RANDOM_STATE,

    "dataset": "placement_question_dataset_3500.csv",

    "total_questions": len(df),

    "domains": {
        domain: int(domain_counts[domain])
        for domain in expected_domains
    },

    "train_questions": len(X_train),

    "test_questions": len(X_test),

    "accuracy": float(accuracy),

    "macro_f1": float(macro_f1),

    "labels": labels,

    "confusion_matrix": cm.tolist()
}


metadata_path = os.path.join(
    MODEL_DIR,
    "domain_classifier_metadata.json"
)

with open(
    metadata_path,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


print("Metadata saved:")
print(metadata_path)

print("\n========================================")
print("TRAINING COMPLETE")
print("========================================")