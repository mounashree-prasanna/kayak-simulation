import os
from dotenv import load_dotenv

load_dotenv()

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

# Kafka Topics
TOPIC_RAW_SUPPLIER_FEEDS = "raw_supplier_feeds"
TOPIC_DEALS_NORMALIZED = "deals.normalized"
TOPIC_DEALS_SCORED = "deals.scored"
TOPIC_DEALS_TAGGED = "deals.tagged"
TOPIC_DEAL_EVENTS = "deal.events"

# Consumer Groups
CONSUMER_GROUP_NORMALIZER = "normalizer-group"
CONSUMER_GROUP_DEAL_DETECTOR = "deal-detector-group"
CONSUMER_GROUP_OFFER_TAGGER = "offer-tagger-group"

