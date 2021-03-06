import os

import facebook
import json
import requests

# get temporary access token here: https://developers.facebook.com/tools/explorer/
from globals import POLITICIANS_INFO_FILE_PATH, FACEBOOK_POSTS_DIRECTORY

access_token = 'EAACEdEose0cBAAKiNQ3ZB3kpnGu7GqkWq4mUHQBb4BuKmae6FHH3jSTIqZBeuqU7hhVv3WiAdxWMLbwx1h9ptmzRWMwufknjSkG2ORXPo8WNuI6IeUGFcrZBciUWE4tD7rXKYGlVdLZB4ZCfQ4hmQdUag39FpdWkxxe9i3gBKcMxwq5kwOvv2CcZAFjr28ls4ZD'

graph = facebook.GraphAPI(access_token)

try:
    with open(POLITICIANS_INFO_FILE_PATH) as data_file:
        users = json.load(data_file)
except ValueError:
    users = []
    print("A problem occurred when parsing politicians_info.json")


def get_posts(user):
    profile = graph.get_object(user['facebook'])
    output_file = os.path.join(FACEBOOK_POSTS_DIRECTORY, user["facebook"] + '_facebook.json')
    results = []

    print("getting {0}".format(user['facebook']))

    posts = graph.get_connections(profile['id'], 'feed?limit=100')

    pages = 0
    while pages < 10:
        try:
            # Perform some action on each post in the collection we receive from
            # Facebook.
            for post in posts['data']:
                results.append(post)

            # Attempt to make a request to the next page of data, if it exists.
            posts = requests.get(posts['paging']['next']).json()
            pages += 1
        except KeyError:
            # When there are no more pages (['paging']['next']), break from the
            # loop and end the script.
            break

    print("posts {0}".format(len(results)))

    with open(output_file, 'w') as outfile:
        json.dump(results, outfile)


for user in users:
    get_posts(user)

print('all done')
