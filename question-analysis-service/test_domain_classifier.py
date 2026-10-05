import joblib
from sentence_transformers import SentenceTransformer

MODEL_PATH = "models/topic_classifier/best_domain_classifier.joblib"

model = joblib.load(MODEL_PATH)

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


questions = [
    # Cloud / general technology
    "What is the difference between IaaS, PaaS and SaaS?",
    "What is virtualization in cloud computing?",

    # Coding
    "What is the difference between == and equals in Java?",
    "What is exception handling in Python?",

    # OOP
    "What is method overriding?",
    "What is the difference between abstraction and encapsulation?",

    # DSA
    "What is the time complexity of binary search?",
    "Which data structure is used to implement BFS?",

    # DBMS
    "What are the ACID properties of a transaction?",
    "What is normalization in a relational database?",

    # Computer Networks
    "What is the purpose of the TCP three-way handshake?",
    "How does DNS resolve a domain name?",

    # Operating Systems
    "What is a process control block?",
    "What is the difference between a process and a thread?"
]


embeddings = embedding_model.encode(
    questions,
    normalize_embeddings=True
)

predictions = model.predict(embeddings)

probabilities = model.predict_proba(embeddings)


print("\n========================================")
print("DOMAIN CLASSIFIER TEST")
print("========================================\n")


for question, prediction, probability in zip(
    questions,
    predictions,
    probabilities
):

    confidence = max(probability) * 100

    print("Question:")
    print(question)

    print("Predicted Domain:", prediction)
    print(f"Confidence: {confidence:.2f}%")

    print("-" * 70)