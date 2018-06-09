import os

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException
from time import sleep
import json
import datetime

from globals import POLITICIANS_INFO_FILE_PATH, TWEETS_DIRECTORY

try:
    with open(POLITICIANS_INFO_FILE_PATH) as data_file:
        users = json.load(data_file)
except:
    users = []
    print("A problem occurred when parsing politicians_info.json")

start_date = datetime.datetime(2018, 3, 1)  # year, month, day
end_date = datetime.datetime(2018, 6, 1)  # year, month, day

# only edit these if you're having problems
delay = 1  # time to wait on each page load before reading the page
driver = webdriver.Safari()  # options are Chrome() Firefox() Safari()

days = (end_date - start_date).days + 1
id_selector = '.time a.tweet-timestamp'
tweet_selector = 'li.js-stream-item'


def format_day(date):
    day = '0' + str(date.day) if len(str(date.day)) == 1 else str(date.day)
    month = '0' + str(date.month) if len(str(date.month)) == 1 else str(date.month)
    year = str(date.year)
    return '-'.join([year, month, day])


def form_url(user, since, until):
    p1 = 'https://twitter.com/search?f=tweets&vertical=default&q=from%3A'
    p2 = user + '%20since%3A' + since + '%20until%3A' + until + 'include%3Aretweets&src=typd'
    return p1 + p2


def increment_day(date, i):
    return date + datetime.timedelta(days=i)


def get_tweets(counter):
    user = users[counter]["twitter"]
    twitter_ids_filename = os.path.join(TWEETS_DIRECTORY, user[1:] + '.json')
    ids = []

    curr_date = start_date
    user_tweet_count = 0
    for day in range(days):
        d1 = format_day(increment_day(curr_date, 0))
        d2 = format_day(increment_day(curr_date, 1))
        url = form_url(user, d1, d2)
        # print(url)
        # print(d1)
        driver.get(url)
        sleep(delay)

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
                    user_tweet_count += 1
                except StaleElementReferenceException as e:
                    print('lost element reference', tweet)

        except NoSuchElementException:
            print('no tweets on this day')

        curr_date = increment_day(curr_date, 1)

    print(' {} tweets by {}'.format(user_tweet_count, user))

    previously_saved_ids = None
    try:
        with open(twitter_ids_filename, "r") as f:
            try:
                previously_saved_ids = json.loads(f.read())
            except:
                pass
    except:
        pass

    with open(twitter_ids_filename, 'w') as outfile:
        all_ids = ids if not previously_saved_ids else ids
        data_to_write = list(set(all_ids))
        json.dump(data_to_write, outfile)


# START
for user in users:
    get_tweets(user)

driver.close()
print('all done here')
