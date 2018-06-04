# lingua-politicae
The goal of this project is to visualize ocial media data produced by politicians from different points of view.

The first visualization we are working on represents each politician as a node in a graph and the weights of the strengh of their connection is proportional to how similar their use of language is on Twitter. It is inspired by [this visualization](https://trello-attachments.s3.amazonaws.com/59da8a7cce93f206776c1d12/59db53014b9d8b772ecfc033/6087102ce596d7f73e59771f8d5b62e6/lexical-distance-among-the-languages-of-europe-mid-size.png) of the lexical distance among different European languages.

So far the techniques used are pretty simple: we represent each tweet as a tfidf vector, we represent each politician as the sum of the tfidf vectors of their tweets and we compute the similarity of their language as the codine similarity of the vectors.
We also cluster the nodes using k-means or spectral clustering. We decide the best number of clusters using the Calinski-Harabaz measure of clustering quality.
In the future we plan to add a temporal dimension to the analysis and an explaination of the  similarity score of each edge based on the dimensions of their vectors that are more similar and more different.
The whole system is thought to be multilingual, the only language specific component so far is the stopword list. The provided one is for italian, but it can be substituted with other files easily.

From the technical point of view, python3 (numpy, scikit-learn, tweetokenize) is used for batch processing (tweet scraping, graph and clustering calculation) while javascript (d3.js) is used for visualizing the results in a browser.
In the forseable future we would make the python code into a service and the javascript part into a webapp that interacts with it.

Install
-------

Clone the repo:

    git clone https://github.com/tezzutezzu/lingua-politicae.git

Create and activate a python3 virtual environment:

    virtualenv venv -p python3
    source venv/bin/activate

Install the requirements with `pip`:

    pip install -r lingua-politicae/requirements.txt

Install `tweetokenize` from this [repo](https://github.com/w4nderlust/tweetokenize):

    git clone https://github.com/w4nderlust/tweetokenize.git
    cd tweetokenize
    python setup.py install
    cd ..


Run
---

After completing the installation, enter `lingua-politicae` dir, activate you virtualenv if it's not already active and run `tweet2graph.py`:

    cd lingua-politicae
    source venv/bin/activate
    python ml/tweet2graph.py

It will use the json files containing tweets in `data` in order to greate `politicians_graph.json`. This json file wil be created inside `xiz` and  will contain all the informations needed by the javascript script to visualize it in the browser.

Start a webserver in the `viz` directory with:

    python -m http.server

Connect to the address returned by the command, usually `http://localhost:8000` and you will be able to visualize the graph of the politicians.
