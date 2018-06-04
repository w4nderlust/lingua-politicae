import sys
import json
from os import listdir

import unidecode
from time import time
from collections import defaultdict

from ascii_graph import Pyasciigraph
from os.path import isfile, join, basename
from sklearn.cluster import SpectralClustering, KMeans
from sklearn.metrics import silhouette_score, calinski_harabaz_score
from tabulate import tabulate
from tweetokenize import Tokenizer
import numpy as np
from scipy import stats
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer

DATA_DIR = 'facebook/posts'
politicians_info_file_path = 'data/politicians_info.json'
graph_file_path = 'viz/public/politicians_graph.json'
stopwords_file_path = 'ml/res/italian_stopwords_big.txt'
english_stopwords_file_path = 'ml/res/english_stopwords.txt'
tweet_stopwords = ['URL', 'ELLIPSIS', 'NUMBER', 'USERNAME']

terms_per_node = 5
terms_per_edge = 5

num_clusters_range = range(2, 15)
clustering_algorithm = KMeans
clustering_quality_measure = calinski_harabaz_score

politicians_info = {}
with open(politicians_info_file_path, 'r') as politicians_info_file:
    politicians_info_list = json.load(politicians_info_file)
    for politician in politicians_info_list:
        politicians_info[politician['facebook']] = politician


# Utils
def file2name(filename):
    return filename.replace('_tweets', '').replace('.json', '')


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
with open(stopwords_file_path) as f:
    stopwords_list = f.readlines()
with open(english_stopwords_file_path) as f:
    english_stopwords_list = f.readlines()
stopwords = [word.strip() for word in stopwords_list if word.strip()] + [word.strip() for word in english_stopwords_list
                                                                         if word.strip()] + tweet_stopwords
politicians_sorted = sorted(list(politicians_info.keys()))
politician_posts = defaultdict(list)
post_list = []
tokenizer = Tokenizer()
print("done in {:0.4f}s".format(time() - t0))

# Collect tweets from JSON
print("Collecting posts...")
t0 = time()
posts_so_far = 0
only_jsons = [f for f in listdir(DATA_DIR) if
              isfile(join(DATA_DIR, f)) and f.endswith('.json') and not f == basename(politicians_info_file_path)]
for post_file in only_jsons:
    with open(join(DATA_DIR, post_file)) as tf:
        posts = json.load(tf)
        for post in posts:
            if 'message' in post:
                post_list.append(unidecode.unidecode(post['message']))
                politician_posts[file2name(post_file)].append(posts_so_far)
                posts_so_far += 1

print("done in {:0.4f}s".format(time() - t0))

# print(tweet_list)
# print(politician_posts)

# Collect politicion names

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
matrix = vectorizer.fit_transform(post_list)
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
for politician, tweet_ids in politician_posts.items():
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

print('similarity matrix scores distribution:')
scores = np.array([v for v in similarity_matrix.values()])
min_scores = np.min(scores)
percentile10_scores = np.percentile(scores, 10)
percentile25_scores = np.percentile(scores, 25)
mean_scores = np.mean(scores)
median_scores = np.median(scores)
percentile75_scores = np.percentile(scores, 75)
percentile90_scores = np.percentile(scores, 90)
max_scores = np.max(scores)
std_scores = np.std(scores)
frequency, values = np.histogram(scores, bins=20)

scores_ranges = []
last = None
for value in values:
    if last is None:
        last = [value, None]
    elif last[1] is None:
        last[1] = value
        scores_ranges.append(last)
    else:
        last = [last[1], value]
        scores_ranges.append(last)

ascii_graph = Pyasciigraph()
for line in ascii_graph.graph('Scores distribution',
                              zip(["[{:0.4f},{:0.4f}]".format(r[0], r[1]) for r in scores_ranges], frequency)):
    print(line)
print(
    "min: {:0.4f}, 10th: {:0.4f}, 25th: {:0.4f}, mean: {:0.4f}, median: {:0.4f}, 75th: {:0.4f}, 90th: {:0.4f}, max: {:0.4f}, std: {:0.4f}".format(
        min_scores, percentile10_scores, percentile25_scores, mean_scores,
        median_scores, percentile75_scores, percentile90_scores, max_scores, std_scores))

# Calculating terms per edge
print("Calculating terms per edge...")
t0 = time()


def weighted_distance(a, b):
    return (1 + np.absolute(a - b)) / np.sqrt((a + 1) * (b + 1))


terms_per_edge_matrix = {}
for i in range(len(politicians_sorted)):
    for j in range(i + 1, len(politicians_sorted)):
        # proto_politician_i = np.squeeze(np.asarray(politician_proto[politicians_sorted[i]]))
        # proto_politician_i /= np.linalg.norm(proto_politician_i)
        #
        # proto_politician_j = np.squeeze(np.asarray(politician_proto[politicians_sorted[j]]))
        # proto_politician_j /= np.linalg.norm(proto_politician_j)
        #
        # distance = np.absolute(proto_politician_i - proto_politician_j)
        # sorted_word_ids = np.argsort(distance)
        #
        # sorted_proto_politician_i = proto_politician_i[sorted_word_ids]
        # sorted_proto_politician_j = proto_politician_j[sorted_word_ids]
        #
        # words_used_by_politician_i = sorted_proto_politician_i != 0
        # words_used_by_politician_j = sorted_proto_politician_j != 0
        # words_used_by_both = np.logical_and(words_used_by_politician_i, words_used_by_politician_j)
        #
        # filtered_sorted_word_ids = sorted_word_ids[words_used_by_both]
        #
        # # normalization
        # filtered_distance = distance[filtered_sorted_word_ids]
        # z_normalized_filtered_distance = stats.zscore(filtered_distance)
        #
        # most_similar_weights = -z_normalized_filtered_distance[:terms_per_edge]
        # most_similar_word_ids = filtered_sorted_word_ids[:terms_per_edge]
        # most_similar_words = [vocab[i] for i in most_similar_word_ids]
        # most_similar = list(zip(most_similar_words, most_similar_weights))
        #
        # most_different_weights = -z_normalized_filtered_distance[-terms_per_edge:]
        # most_different_word_ids = filtered_sorted_word_ids[-terms_per_edge:]
        # most_different_words = [vocab[i] for i in most_different_word_ids]
        # most_different = list(zip(most_different_words, most_different_weights))
        #
        # terms_per_edge_matrix[(politicians_sorted[i], politicians_sorted[j])] = {"most_similar": most_similar,
        #                                                                          "most_different": most_different}

        proto_politician_i = np.squeeze(np.asarray(politician_proto[politicians_sorted[i]]))
        proto_politician_j = np.squeeze(np.asarray(politician_proto[politicians_sorted[j]]))

        difference = proto_politician_i - proto_politician_j
        distance = weighted_distance(proto_politician_i, proto_politician_j)
        z_normalized_difference = stats.zscore(difference)

        sorted_difference_word_ids = np.argsort(difference)
        sorted_distance_word_ids = np.argsort(distance)

        # get top k similar words
        sorted_proto_politician_i = proto_politician_i[sorted_distance_word_ids]
        sorted_proto_politician_j = proto_politician_j[sorted_distance_word_ids]

        words_used_by_politician_i = sorted_proto_politician_i != 0
        words_used_by_politician_j = sorted_proto_politician_j != 0
        words_used_by_both = np.logical_and(words_used_by_politician_i, words_used_by_politician_j)

        filtered_sorted_word_ids = sorted_distance_word_ids[words_used_by_both]
        filtered_sorted_z_normalized_difference = z_normalized_difference[filtered_sorted_word_ids]

        most_correlated_with_both_weights = filtered_sorted_z_normalized_difference[:terms_per_edge]
        most_correlated_with_both_word_ids = filtered_sorted_word_ids[:terms_per_edge]
        most_correlated_with_both_words = [vocab[i] for i in most_correlated_with_both_word_ids]
        most_correlated_with_both = list(zip(most_correlated_with_both_words, most_correlated_with_both_weights))

        # get dissimilar words
        sorted_z_normalized_difference = z_normalized_difference[sorted_difference_word_ids]

        most_correlated_with_i_weights = sorted_z_normalized_difference[-terms_per_edge:]
        most_correlated_with_i_ids = sorted_difference_word_ids[-terms_per_edge:]
        most_correlated_with_i_words = [vocab[i] for i in most_correlated_with_i_ids]
        most_correlated_with_i = list(zip(most_correlated_with_i_words, most_correlated_with_i_weights))

        most_correlated_with_j_weights = sorted_z_normalized_difference[:terms_per_edge]
        most_correlated_with_j_ids = sorted_difference_word_ids[:terms_per_edge]
        most_correlated_with_j_words = [vocab[i] for i in most_correlated_with_j_ids]
        most_correlated_with_j = list(zip(most_correlated_with_j_words, most_correlated_with_j_weights))

        terms_per_edge_matrix[(politicians_sorted[i], politicians_sorted[j])] = {
            "most_correlated_with_both": most_correlated_with_both,
            "most_correlated_with_source": most_correlated_with_i,
            "most_correlated_with_target": most_correlated_with_j}

print("done in {:0.4f}s".format(time() - t0))

# Calculating terms per edge
print("Calculating terms per node...")
t0 = time()
terms_per_node_matrix = {}
for i in range(len(politicians_sorted)):
    proto_politician_i = np.squeeze(np.asarray(politician_proto[politicians_sorted[i]]))
    sorted_distance_word_ids = np.argsort(proto_politician_i)
    sorted_proto_politician_i = proto_politician_i[sorted_distance_word_ids]
    words_used_by_politician_i = np.logical_not(sorted_proto_politician_i == 0)
    filtered_sorted_word_ids = sorted_distance_word_ids[words_used_by_politician_i]

    most_important_word_ids = filtered_sorted_word_ids[-terms_per_node:]
    most_important_weights = proto_politician_i[most_important_word_ids]
    most_important_words = [vocab[i] for i in most_important_word_ids]
    most_important = list(zip(most_important_words, most_important_weights))

    terms_per_node_matrix[politicians_sorted[i]] = {"most_important": most_important}
print("done in {:0.4f}s".format(time() - t0))

# Calculating clusters and finding the best scoring number of them
print("Calculating clustering...")
t0 = time()

politician_vectors = []
for politician in politicians_sorted:
    politician_vectors.append(politician_proto[politician] / np.linalg.norm(politician_proto[politician]))
politicians_matrix = np.stack(politician_vectors)

quality_avgs = []
max_quality = -1
best_model = None
best_cluster_labels = None
best_cluster_distances = None

for num_clusters in num_clusters_range:
    # Initialize the model with num_clusters value and a random generator
    # seed of 10 for reproducibility.
    model = clustering_algorithm(n_clusters=num_clusters, random_state=10)
    cluster_labels = model.fit_predict(politicians_matrix)
    if getattr(model, "transform", None) is not None:
        unnorm_cluster_distances = model.transform(politicians_matrix)
        cluster_distances = unnorm_cluster_distances / np.expand_dims(unnorm_cluster_distances.sum(axis=1), axis=1)
    else:
        cluster_distances = None
    quality_score = clustering_quality_measure(politicians_matrix, cluster_labels)

    quality_avgs.append([num_clusters, quality_score])
    if quality_score > max_quality:
        max_quality = quality_score
        best_model = model
        best_cluster_labels = cluster_labels
        best_cluster_distances = cluster_distances

ascii_graph = Pyasciigraph(float_format='{0:0.4f}')
for line in ascii_graph.graph(clustering_quality_measure.__name__, quality_avgs):
    print(line)

print("done in {:0.4f}s".format(time() - t0))

# Building politicians graph
print("Building politicians graph...")
t0 = time()
nodes = []
for i, politician in enumerate(politicians_sorted):
    nodes.append(
        {'name': politicians_info[politician]['name'],
         'party': politicians_info[politician]['party'],
         'twitter': politicians_info[politician]['twitter'],
         'tweets': len(politician_posts[politician]),
         'cluster': np.asscalar(best_cluster_labels[i]),
         'cluster_distances': best_cluster_distances[i].tolist() if best_cluster_distances is not None else None,
         'most_important_words': list(reversed(terms_per_node_matrix[politician]['most_important']))})

edges = []
for i in range(len(politicians_sorted)):
    for j in range(i + 1, len(politicians_sorted)):
        edges.append({'source': i, 'target': j,
                      'weight': similarity_matrix[(politicians_sorted[i], politicians_sorted[j])],
                      'words': terms_per_edge_matrix[(politicians_sorted[i], politicians_sorted[j])]})
graph = {'nodes': nodes, 'edges': edges}
print("done in {:0.4f}s".format(time() - t0))

print('graph:')
print(graph)

# Saving politicians graph
print("Saving politicians graph...")
t0 = time()
with open(graph_file_path, 'w') as gf:
    json.dump(graph, gf)
print("done in {:0.4f}s".format(time() - t0))
