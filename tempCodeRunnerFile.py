import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import numpy as np
from sentence_transformers import SentenceTransformer
import trafilatura
from concurrent.futures import ThreadPoolExecutor, as_completed

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

import sys

try:
    # Make prints UTF-8 friendly on Python 3.7+
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    # If running in an environment that doesn't support reconfigure, just ignore.
    pass

def fetch_article_content(url: str) -> str:

    try:
        downloaded = trafilatura.fetch_url(url)
    except Exception as e:
        print(f"Error fetching URL {url}: {e}")
        return None
    
    if downloaded is None:
        return None

    text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
    return text



def embed_text(text: str) -> np.ndarray:
    if text is None or text.strip() == "":
        return None
    segments = [seg.strip() for seg in text.split("\n") if seg.strip()]
 
    embeddings = model.encode(segments)

    embeddings = np.array(embeddings)
    if embeddings.ndim == 1:
        return embeddings

    avg_embedding = np.mean(embeddings, axis=0)
    return avg_embedding


def is_junk_href(href: str) -> bool:

    if href is None:
        return True
    href = href.strip()
    if href == "" or href.startswith("#"):
        return True

    lower_href = href.lower()
    if lower_href.startswith("javascript:") or lower_href.startswith("mailto:") or lower_href.startswith("tel:"):
        return True

    if lower_href.endswith((".jpg", ".jpeg", ".png", ".gif", ".svg", ".pdf", ".zip")):
        return True
    return False


def extract_links(base_url: str, html: str):
    links = []
    seen_urls = set()
    
    base_domain = urlparse(base_url).netloc
    if base_domain.startswith("www."):
        base_domain = base_domain[len("www."):]
        
    soup = BeautifulSoup(html, "html.parser")
    
    for a in soup.find_all("a", href=True):
        href = a['href']
        
        if is_junk_href(href):
            continue
    
        full_url = urljoin(base_url, href)
  
        parsed = urlparse(full_url)
        link_domain = parsed.netloc
        if link_domain.startswith("www."):
            link_domain = link_domain[len("www."):]
            
        if link_domain != "" and link_domain != base_domain:
            continue
    
        clean_url = full_url.split('#')[0]
        
        if clean_url in seen_urls:
            continue
        seen_urls.add(clean_url)
 
        anchor_text = a.get_text().strip()
        title = anchor_text if anchor_text else clean_url
        
        links.append({"url": clean_url, "title": title})
    return links

def fetch_homepage(site_name: str, site_url: str, timeout: float = 10.0):

    try:
        resp = requests.get(
            site_url,
            timeout=timeout,
            headers={"User-Agent": "Mozilla/5.0"} 
        )
        resp.raise_for_status()  
        return site_name, site_url, resp.text
    except Exception as e:
        print(f"Skipping site {site_name} ({site_url}) due to fetch error: {e}")
        return site_name, site_url, None


NEWS_SITES = [
    ("Ynet", "https://www.ynet.co.il"),
    ("Walla", "https://news.walla.co.il"),
    ("Mako", "https://www.mako.co.il"),
]



def compare_to_sites(input_url: str, target_sites, similarity_threshold: float = 0.6):
 

    input_text = fetch_article_content(input_url)
    if input_text is None:
        print(f"Failed to retrieve content from {input_url}")
        return []
    
    input_embedding = embed_text(input_text)
    if input_embedding is None:
        print(f"No content to embed for {input_url}")
        return []
    
    parsed_input = urlparse(input_url)
    input_domain = parsed_input.netloc.lstrip('www.')
    input_path = parsed_input.path.rstrip('/')
    
    similar_articles = []
 
    # with ThreadPoolExecutor(max_workers=min(len(target_sites), 5)) as homepage_executor:
    with ThreadPoolExecutor(max_workers=20) as homepage_executor:
        # Submit one homepage fetch per site
        future_to_site = {
            homepage_executor.submit(fetch_homepage, site_name, site_url): (site_name, site_url)
            for site_name, site_url in target_sites
        }
        
        for future in as_completed(future_to_site):
            site_name, site_url = future_to_site[future]
            try:
                _site_name, _site_url, homepage_html = future.result()
            except Exception as e:
                print(f"Error fetching homepage for {site_name}: {e}")
                continue
            
            if not homepage_html:
                continue
            
            candidates = extract_links(site_url, homepage_html)
            with ThreadPoolExecutor(max_workers=20) as article_executor:
                article_futures = [
                    article_executor.submit(
                        process_candidate_article,
                        article,
                        site_name,
                        input_embedding,
                        input_domain,
                        input_path,
                        similarity_threshold,
                    )
                    for article in candidates
                ]

                for article_future in as_completed(article_futures):
                    try:
                        result = article_future.result()
                    except Exception:
                        # Ignore a bad candidate and keep going
                        continue
                    if result is not None:
                        similar_articles.append(result)
    # for site_name, site_url in target_sites:
    #     try:
    #         resp = requests.get(site_url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
    #         homepage_html = resp.text
    #     except Exception as e:
    #         print(f"Skipping site {site_name} ({site_url}) due to fetch error: {e}")
    #         continue
     
    #     candidates = extract_links(site_url, homepage_html)

    #     with ThreadPoolExecutor(max_workers=10) as executor:
    #         futures = [
    #             executor.submit(
    #                 process_candidate_article,
    #                 article,
    #                 site_name,
    #                 input_embedding,
    #                 input_domain,
    #                 input_path,
    #                 similarity_threshold
    #             )
    #             for article in candidates
    #         ]
    #         for future in as_completed(futures):
    #             try:
    #                 result = future.result()
    #             except Exception:
    #                 continue
    #             if result is not None:
    #                 similar_articles.append(result)
    #     # for article in candidates:
    #     #     art_url = article["url"]
    #     #     art_title = article["title"]
  
    #     #     art_parsed = urlparse(art_url)
    #     #     art_domain = art_parsed.netloc.lstrip('www.')
    #     #     art_path = art_parsed.path.rstrip('/')
    #     #     if art_domain == input_domain and art_path == input_path:
    #     #         continue
           
    #     #     art_text = fetch_article_content(art_url)
    #     #     if art_text is None:
    #     #         continue  
    #     #     art_embedding = embed_text(art_text)
    #     #     if art_embedding is None:
    #     #         continue
            
    #     #     sim = np.dot(input_embedding, art_embedding) / (np.linalg.norm(input_embedding) * np.linalg.norm(art_embedding))
    #     #     if sim >= similarity_threshold:
    #     #         similar_articles.append((sim, site_name, art_title, art_url))
    # # Sort the results by similarity in descending order
    similar_articles.sort(key=lambda x: x[0], reverse=True)
    return similar_articles


def process_candidate_article(article, site_name,
                              input_embedding,
                              input_domain, input_path,
                              similarity_threshold):
    art_url = article["url"]
    art_title = article["title"]
    
    art_parsed = urlparse(art_url)
    art_domain = art_parsed.netloc.lstrip('www.')
    art_path = art_parsed.path.rstrip('/')
    if art_domain == input_domain and art_path == input_path:
        return None

    art_text = fetch_article_content(art_url)
    if art_text is None:
        return None
    
    art_embedding = embed_text(art_text)
    if art_embedding is None:
        return None
    
    denom = (np.linalg.norm(input_embedding) * np.linalg.norm(art_embedding))
    if denom == 0:
        return None
    
    sim = float(np.dot(input_embedding, art_embedding) / denom)

    if sim >= similarity_threshold:
        return (sim, site_name, art_title, art_url)

    return None

# 8. Convenience function to use default news sites
def get_related_articles(input_url: str, similarity_threshold: float = 0.6):
    """
    Find related articles to the input_url across the predefined list of news sites.
    This is a wrapper around compare_to_sites using default NEWS_SITES.
    """
    return compare_to_sites(input_url, target_sites=NEWS_SITES, similarity_threshold=similarity_threshold)


# Example usage:
input_article_url = "https://www.israelhayom.co.il/news/politics/article/19250170"
results = get_related_articles(input_article_url, similarity_threshold=0.6)
for sim, site, title, url in results:
    print(f"{sim:.2f} | {site} | {title} | {url}")
