from .feed_ingestion import FeedIngestion
from .normalization import NormalizationStage
from .deal_detector import DealDetector
from .offer_tagger import OfferTagger

# Import DealsAgent from parent directory if it exists there
try:
    from ..deals_agent import DealsAgent
    __all__ = ["FeedIngestion", "NormalizationStage", "DealDetector", "OfferTagger", "DealsAgent"]
except ImportError:
    __all__ = ["FeedIngestion", "NormalizationStage", "DealDetector", "OfferTagger"]

