import tweepy
import json
import math
import glob
import csv
import zipfile
import zlib
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException
from time import sleep
import json
import datetime


with open('api_keys.json') as f:
    keys = json.load(f)

auth = tweepy.OAuthHandler(keys['consumer_key'], keys['consumer_secret'])
auth.set_access_token(keys['access_token'], keys['access_token_secret'])

api = tweepy.API(auth)

# immagine,url immagine,Nome,Cognome,partito,descrizione,controllato,twitter,twitter link,tweets,twitter verified,incarico,location,facebook

# Map row to dictionary (dictionary comprehension)
def getObject(column_names, row):
    return {column_names[column]: data for column, data in enumerate(row) if column < len(column_names)}

# Map CSV file to list of dictionaries (list comprehension)
users = [getObject(['immagine','url immagine','Nome','Cognome','partito','descrizione','controllato','twitter','twitter link','tweets', 'twitter verified','incarico','location','facebook'], row) for row in csv.reader(open('deputati.csv', 'r'))]
users = users[1:]
users = [p for p in users if(p['controllato'] != 'NO')]
users = [p for p in users if(p['twitter'] != '')]
users = [p for p in users if(p['tweets'] != '')]
users = sorted(users, key=lambda user: int(user["tweets"]), reverse=True)
users = users[163:]


userCounter = 0

startDate = datetime.datetime(2017, 1, 1)  # year, month, day
endDate = datetime.datetime(2017, 11, 18)  # year, month, day
days = (endDate - startDate).days + 1

delay = 1  # time to wait on each page load before reading the page
driver = webdriver.Safari()  # options are Chrome() Firefox() Safari()

id_selector = '.time a.tweet-timestamp'
tweet_selector = 'li.js-stream-item'


def format_day(date):
    day = '0' + str(date.day) if len(str(date.day)) == 1 else str(date.day)
    month = '0' + str(date.month) if len(str(date.month)) == 1 else str(date.month)
    year = str(date.year)
    return '-'.join([year, month, day])

def form_url(user, since, until):
    p1 = 'https://twitter.com/search?f=tweets&vertical=default&q=from%3A'
    p2 =  user + '%20since%3A' + since + '%20until%3A' + until + 'include%3Aretweets&src=typd'
    return p1 + p2

def increment_day(date, i):
    return date + datetime.timedelta(days=i)

def getTweets(counter):

    user = users[counter]
    handle = user["twitter"]
    ids = []
    output_file = './output/{}_tweets.json'.format(handle)

    myDate = startDate

    for day in range(days):
        d1 = format_day(increment_day(myDate, 0))
        d2 = format_day(increment_day(myDate, 1))
        url = form_url(handle, d1, d2)
        driver.get(url)
        sleep(delay)

        # get tweets ids
        try:
            found_tweets = driver.find_elements_by_css_selector(tweet_selector)
            increment = 10

            while len(found_tweets) >= increment:
                # print('scrolling down to load more tweets')
                driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
                sleep(delay)
                found_tweets = driver.find_elements_by_css_selector(tweet_selector)
                increment += 10


            for tweet in found_tweets:
                try:
                    id = tweet.find_element_by_css_selector(id_selector).get_attribute('href').split('/')[-1]
                    ids.append(id)
                except StaleElementReferenceException as e:
                    print('lost element reference', tweet)
        
        except NoSuchElementException:
            print('no tweets on this day')


        myDate = increment_day(myDate, 1)



    user["tweets"] = []
    start = 0
    end = 100
    limit = len(ids)
    i = math.ceil(limit / 100)

    for go in range(i):
        print('currently getting {} - {}'.format(start, end))
        sleep(6)  # needed to prevent hitting API rate limit
        id_batch = ids[start:end]
        start += 100
        end += 100
        tweets = api.statuses_lookup(id_batch)
        for tweet in tweets:
            user["tweets"].append(dict(tweet._json))

    print('metadata collection complete')
    
    print('creating master json file')

    with open(output_file, 'w') as outfile:
        json.dump(user, outfile)


  
    def is_retweet(entry):
        return 'retweeted_status' in entry.keys()

    def get_source(entry):
        if '<' in entry["source"]:
            return entry["source"].split('>')[1].split('<')[0]
        else:
            return entry["source"]



    counter += 1
    
    if counter < len(users):

        getTweets(counter)

    else:
        driver.close()
        print('all done')


    return


# START
getTweets(userCounter)



