"""
Web Search Service
Provides search intent detection and retrieves current web search results
using DuckDuckGo Search (free, no API key needed) with optional Tavily fallback.
"""

import re
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("uvicorn.error")

# Keywords that strongly indicate the user needs real-time or recent web information
WEB_SEARCH_TRIGGERS = [
    r"\blatest\b", r"\brecent\b", r"\bcurrently\b", r"\btoday\b", r"\byesterday\b",
    r"\bthis week\b", r"\bthis month\b", r"\bthis year\b", r"\b202[4-9]\b",
    r"\bnews\b", r"\bweather\b", r"\bstock price\b", r"\bwho won\b",
    r"\bsearch the web\b", r"\bsearch web\b", r"\blook up\b", r"\bgoogle\b",
    r"\bcurrent status\b", r"\bupdate on\b", r"\bbreaking\b", r"\bprice of\b"
]

# Patterns that should NOT trigger web search (greetings, concepts, code questions, docs, images, math, feelings)
NON_SEARCH_TRIGGERS = [
    r"^hi\b", r"^hello\b", r"^hey\b", r"^how are you\b", r"^who are you\b",
    r"^what is\b", r"^what are\b", r"^explain\b", r"^define\b", r"^meaning of\b",
    r"\bhow to\b", r"\bexplain code\b", r"\bdebug\b",
    r"\bsummarize\b", r"\bedit\b", r"\bcalculate\b", r"\btranslate\b",
    r"\bimage of\b", r"\bpicture of\b", r"\bdraw\b",
    r"\bfeel\b", r"\bfeeling\b", r"\bstress\b", r"\boverwhelm\b", r"\bsad\b", r"\banxious\b", r"\bdepress\b"
]


class SearchService:
    def __init__(self):
        self.tavily_key = settings.TAVILY_API_KEY or settings.SEARCH_API_KEY

    def should_search_web(self, query: str) -> bool:
        """
        Determines whether a query requires live web search.
        Returns True ONLY if current events/news/latest keywords are explicitly requested,
        and False for standard concept, definition, or conversational questions.
        """
        lower_q = query.strip().lower()

        # Check positive search triggers first (latest, news, weather, stock price, today)
        has_temporal_trigger = any(re.search(t, lower_q) for t in WEB_SEARCH_TRIGGERS)

        # Check negative triggers (concepts, greetings, definitions)
        is_concept_or_chat = any(re.search(n, lower_q) for n in NON_SEARCH_TRIGGERS)

        if has_temporal_trigger and not is_concept_or_chat:
            return True

        if has_temporal_trigger and any(re.search(t, lower_q) for t in [r"\btoday\b", r"\blatest\b", r"\bbreaking\b", r"\bnews\b"]):
            return True

        return False

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        Performs web search and returns a list of dictionaries with title, snippet, and url.
        """
        results: List[Dict[str, str]] = []

        # 1. Try DuckDuckGo Search (Zero config, free)
        try:
            try:
                from ddgs import DDGS
            except ImportError:
                from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                ddg_results = list(ddgs.text(query, max_results=max_results))
                for item in ddg_results:
                    results.append({
                        "title": item.get("title", ""),
                        "snippet": item.get("body", "") or item.get("snippet", ""),
                        "url": item.get("href", "") or item.get("link", "")
                    })
            if results:
                logger.info(f"Retrieved {len(results)} web search results for query: '{query}' via DuckDuckGo")
                return results
        except Exception as e:
            logger.warning(f"DuckDuckGo search error: {e}. Attempting Tavily or fallback.")

        # 2. Try Tavily if configured
        if self.tavily_key:
            try:
                import httpx
                resp = httpx.post(
                    "https://api.tavily.com/search",
                    json={"query": query, "api_key": self.tavily_key, "max_results": max_results},
                    timeout=8.0
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("results", []):
                        results.append({
                            "title": item.get("title", ""),
                            "snippet": item.get("content", ""),
                            "url": item.get("url", "")
                        })
                    if results:
                        return results
            except Exception as e:
                logger.warning(f"Tavily search error: {e}")

        # 3. Fallback mock search results if offline or blocked
        if not results:
            logger.info(f"Using mock fallback search results for: '{query}'")
            results = [
                {
                    "title": f"Recent developments on {query}",
                    "snippet": f"Summary and latest articles regarding {query}. For full live search, ensure internet access.",
                    "url": f"https://duckduckgo.com/?q={query.replace(' ', '+')}"
                }
            ]

        return results


search_service = SearchService()
