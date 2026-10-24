import os
import sys
import json
from collections import Counter

import pandas as pd
from sklearn.metrics import confusion_matrix, classification_report
import joblib
from sentence_transformers import SentenceTransformer

base = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.normpath(os.path.join(base, '..', 'data', 'question_topic_dataset_1500.csv'))
model_path = os.path.normpath(os.path.join(base, '..', 'models', 'topic_classifier', 'topic_classifier_compiler_design.joblib'))

if not os.path.exists(csv_path):
    print(json.dumps({'error': f'dataset not found: {csv_path}'}))
    sys.exit(2)
if not os.path.exists(model_path):
    print(json.dumps({'error': f'model not found: {model_path}'}))
    sys.exit(2)

# read CSV without header
df = pd.read_csv(csv_path, header=None, names=['question','domain','topic'])
cd = df[df['domain'].str.strip() == 'Compiler Design'].copy()
if cd.empty:
    print(json.dumps({'error': 'no Compiler Design rows in dataset'}))
    sys.exit(2)

counts = cd['topic'].value_counts().to_dict()

# load model
model = joblib.load(model_path)

# generate embeddings using the same sentence-transformer used by the service
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# predict
X = cd['question'].astype(str).tolist()
y_true = cd['topic'].astype(str).tolist()
try:
    embeddings = embedder.encode(X, show_progress_bar=False)
    y_pred = model.predict(embeddings)
except Exception as e:
    print(json.dumps({'error': 'model.predict failed', 'exception': str(e)}))
    sys.exit(2)

labels = sorted(list(set(y_true) | set(y_pred)))
cm = confusion_matrix(y_true, y_pred, labels=labels)
report = classification_report(y_true, y_pred, labels=labels, zero_division=0, output_dict=True)

# compute top misclassifications
import numpy as np
mis = []
for i, t in enumerate(labels):
    for j, p in enumerate(labels):
        if i == j: continue
        cnt = int(cm[i, j])
        if cnt > 0:
            mis.append({'true': t, 'pred': p, 'count': cnt})
mis_sorted = sorted(mis, key=lambda x: x['count'], reverse=True)

out = {
    'dataset_rows_for_compiler_design': int(len(cd)),
    'topic_counts': counts,
    'labels': labels,
    'confusion_matrix': cm.tolist(),
    'classification_report': report,
    'top_misclassifications': mis_sorted[:20]
}
print(json.dumps(out, indent=2))
