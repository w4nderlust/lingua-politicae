import facebook
import json
import requests



# get temporary access token here: https://developers.facebook.com/tools/explorer/
access_token = 'EAACEdEose0cBAKPrzes1Sj7LCxlDZAZBcMm3xYC0jgZBJoFN4kQKxMlrIRfmgd2Do5MMbLWuISnrEbylT2oKjRwbPaOQzHkfcCt7bcTP2aW9o1B8J1jQC8a9ffaOMoPCe6FyNMn3IgKg2UvcpUshFetlZAWgJctzPp7Kkh39ZB2XvyPtDgaErKuwpn7BCF28ZD'

graph = facebook.GraphAPI(access_token)

try:
    with open('../data/politicians_info.json') as data_file:
        users = json.load(data_file)
except ValueError:
    print("A problem occurred when parsing politicians_info.json")

def getPosts(counter):
    user = users[counter]
    profile = graph.get_object(user['facebook'])
    output_file = './{}_facebook.json'.format(user['twitter'])

    posts = graph.get_connections(profile['id'], 'feed?limit=100')
    results = []
    for post in posts['data']:
        results.append(post)
    
    with open(output_file, 'w') as outfile:
        json.dump(results, outfile)

    counter += 1
    
    if counter < len(users):
        getPosts(counter)
    else:
        print('all done')


getPosts(0)