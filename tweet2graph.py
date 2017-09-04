import json
import unidecode
from time import time
from collections import defaultdict

from tabulate import tabulate
from tweetokenize import Tokenizer
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer

# Inputs
tweet_files = ['civati_short.json', 'giorgiameloni_short.json', 'giulianopisapia_short.json', 'meb_short.json',
               'nichivendola_short.json', 'pbersani_short.json']
graph_file = 'politicians_graph.json'
stopwords_file = 'italian_stopwords_big.txt'
tweet_stopwords = ['URL', 'ELLIPSIS', 'NUMBER', 'USERNAME']


# Utils
def file2name(filename):
    filename = filename.split('.')[0]
    filename = filename.split('_')[0]
    return '@' + filename


def tokenize(text):
    tokens = [token for token in tokenizer.tokenize(unidecode.unidecode(text.replace("'", " "))) if len(token) > 2]
    return tokens


def term_scores(vectorizer, matrix):
    # http://stackoverflow.com/questions/16078015/
    matrix_binary = matrix.copy()
    matrix_binary[matrix_binary > 0] = 1
    matrix_binary = matrix_binary.astype(np.int32)

    scores = zip(vectorizer.get_feature_names(),
                 np.asarray(matrix.sum(axis=0)).ravel(),
                 np.asarray(matrix_binary.sum(axis=0)).ravel(),
                 vectorizer.idf_)
    sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
    return sorted_scores


# Initilization
print("Initilizing...")
t0 = time()
with open(stopwords_file) as f:
    stopwords_list = f.readlines()
stopwords = [word.strip() for word in stopwords_list if word.strip()] + tweet_stopwords
politicians_sorted = sorted([file2name(tweet_file) for tweet_file in tweet_files])
politician_tweets = defaultdict(list)
tweet_list = []
tokenizer = Tokenizer()
print("done in {:0.4f}s".format(time() - t0))

# Collect tweets from JSON
print("Collecting tweets...")
t0 = time()
tweets_so_far = 0
for tweet_file in tweet_files:
    with open(tweet_file) as tf:
        tweets = json.load(tf)
        for tweet in tweets:
            tweet_list.append(unidecode.unidecode(tweet['text']))
            politician_tweets[file2name(tweet_file)].append(tweets_so_far)
            tweets_so_far += 1
print("done in {:0.4f}s".format(time() - t0))

# print(tweet_list)
# print(politician_tweets)

# Calculating tf-idf features
print("Calculating vectorization...")
t0 = time()
# vectorizer = CountVectorizer(max_df=0.95, min_df=5,
#                              max_features=50000,
#                              stop_words=stopwords,
#                              tokenizer=tokenize)
vectorizer = TfidfVectorizer(max_df=0.95, min_df=5,
                             max_features=10000,
                             stop_words=stopwords,
                             tokenizer=tokenize)
matrix = vectorizer.fit_transform(tweet_list)
print("done in {:0.4f}s".format(time() - t0))

# print('tfidf:')
# print(tfidf)

# Show tfidf matrix stats
vocab = vectorizer.get_feature_names()
print("Vocabulary:")
print(vocab)
vocab_max_len = max(map(len, vocab))
scores = term_scores(vectorizer, matrix)
print("Word scores:")
print(tabulate(scores, headers=['Word', 'Score', 'DF', 'IDF']))

'''
vec = tfidf_matrix.named_steps['vec']
features = vec.get_feature_names()

def top_tfidf_feats(row, features, top_n=25):
    # Get top n tfidf values in row and return them with their corresponding feature names.
    topn_ids = np.argsort(row)[::-1][:top_n]
    top_feats = [(features[i], row[i]) for i in topn_ids]
    df = pd.DataFrame(top_feats)
    df.columns = ['feature', 'tfidf']
    return df

def top_feats_in_doc(tfidf_matrix, features, row_id, top_n=25):
    # Top tfidf features in specific document (matrix row)
    row = np.squeeze(tfidf_matrix[row_id].toarray())
    return top_tfidf_feats(row, features, top_n)

def top_mean_feats(tfidf_matrix, features, grp_ids=None, min_tfidf=0.1, top_n=25):
    # Return the top n features that on average are most important amongst documents in rows
    # indentified by indices in grp_ids.
    if grp_ids:
        D = tfidf_matrix[grp_ids].toarray()
    else:
        D = tfidf_matrix.toarray()

    D[D < min_tfidf] = 0
    tfidf_means = np.mean(D, axis=0)
    return top_tfidf_feats(tfidf_means, features, top_n)

print(top_mean_feats(tfidf_matrix, features))
'''

# Calculating politicians prototypes
print("Calculating politicians prototypes...")
t0 = time()
politician_proto = {}
for politician, tweet_ids in politician_tweets.items():
    proto = np.zeros(matrix.shape[1])
    for tweet_id in tweet_ids:
        proto += matrix[tweet_id]
    politician_proto[politician] = proto
print("done in {:0.4f}s".format(time() - t0))

# print(politician_proto)

# Calculating similarities
print("Calculating similarities...")
t0 = time()
similarity_matrix = {}
for i in range(len(politicians_sorted)):
    for j in range(i + 1, len(politicians_sorted)):
        proto_politician_i = politician_proto[politicians_sorted[i]]
        proto_politician_j = politician_proto[politicians_sorted[j]]
        cosine_similarity = np.dot(proto_politician_i, proto_politician_j.T) / \
                            (np.linalg.norm(proto_politician_i) * np.linalg.norm(proto_politician_j))
        similarity_matrix[(politicians_sorted[i], politicians_sorted[j])] = np.asscalar(cosine_similarity)
print("done in {:0.4f}s".format(time() - t0))

print('similarity_matrix:')
print(sorted(similarity_matrix.items(), key=lambda x: -x[1]))

# Building politicians graph
print("Building politicians graph...")
t0 = time()
nodes = []
for politician in politicians_sorted:
    nodes.append({'name': politician, 'tweets': len(politician_tweets[politician])})

edges = []
for i in range(len(politicians_sorted)):
    for j in range(i + 1, len(politicians_sorted)):
        edges.append({'source': i, 'target': j,
                      'weight': similarity_matrix[(politicians_sorted[i], politicians_sorted[j])]})
graph = {'nodes': nodes, 'edges': edges}
print("done in {:0.4f}s".format(time() - t0))

print('graph:')
print(graph)

# Saving politicians graph
print("Saving politicians graph...")
t0 = time()
with open(graph_file, 'w') as gf:
    json.dump(graph, gf)
print("done in {:0.4f}s".format(time() - t0))
