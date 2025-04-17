from typing import List, Optional, Tuple, Union
import numpy as np
import re
from .supabase_db import create_supabase_client

class Retriever:
    def __init__(self):
        self.supabase = create_supabase_client()

    def _convert_embedding_to_list(self, embedding: Union[List[float], np.ndarray]) -> List[float]:
        """Convert embedding to list format if it's a numpy array."""
        if isinstance(embedding, np.ndarray):
            return embedding.tolist()
        return embedding

    def filtered_hybrid_search(
        self,
        query_text: str,
        query_embedding: Union[List[float], np.ndarray],
        relevant_doc_ids: List[int],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, int, float, float]]:
        """
        Perform hybrid search (text + embedding) with document filtering.
        Returns list of (id, content, embedding_id, similarity, text_rank) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        
        # Preprocess query_text to create tsquery string (e.g., 'term1:* | term2:* | term3:*')
        stop_words = {'i', 'want', 'to', 'an', 'on', 'the', 'a', 'and', 'or'}
        words = [word for word in re.sub(r'[^\w\s]', '', query_text).lower().split() if word not in stop_words]
        ts_query = ' | '.join(f'{word}:*' for word in words) if words else '*:*'
        
        query = {
            'query_text': ts_query,
            'query_embedding': query_embedding,
            'relevant_doc_ids': relevant_doc_ids,
            'limit_rows': limit_rows,
            'offset_rows': offset_rows
        }
        print("Query", query)
        response = self.supabase.rpc(
            'filtered_hybrid_search_chunks',
            {
                'query_text': ts_query,
                'query_embedding': query_embedding,
                'relevant_doc_ids': relevant_doc_ids,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        print("filtered_hybrid_search resp:", response)
        
        # Fallback to embedding-only search if no results
        if not response.data:
            print("No chunks found. Falling back to embedding-only search.")
            return self.filtered_search(
                query_embedding=query_embedding,
                relevant_doc_ids=relevant_doc_ids,
                limit_rows=limit_rows,
                offset_rows=offset_rows
            )
        
        return [(r['id'], r['content'], r['embedding_id'], r['similarity'], r['text_rank']) for r in response.data]

    def filtered_search(
        self,
        query_text: str,
        query_embedding: Union[List[float], np.ndarray],
        relevant_doc_ids: List[int],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, int, float]]:
        """
        Perform embedding-based search with document filtering.
        Returns list of (id, content, embedding_id, similarity) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        response = self.supabase.rpc(
            'filtered_search_chunks',
            {   'query_text': query_text,
                'query_embedding': query_embedding,
                'relevant_doc_ids': relevant_doc_ids,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        print("filtered_search resp:", response)
        return [(r['id'],r['content'], r['embedding_id'], r['similarity']) for r in response.data]

    def get_document_ids_by_urls(self, urls: List[str]) -> List[int]:
        """Get document IDs for given URLs."""
        response = self.supabase.rpc(
            'get_document_ids_by_urls',
            {'urls': urls}
        ).execute()
        print("get_doc_ids_by_urls resp:", response)
        return response.data

    def hybrid_search(
        self,
        query_text: str,
        query_embedding: Union[List[float], np.ndarray],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, int, float, float]]:
        """
        Perform hybrid search (text + embedding) without filtering.
        Returns list of (id, content, embedding_id, similarity, text_rank) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        
        # Preprocess query_text to create tsquery string (e.g., 'term1:* | term2:* | term3:*')
        stop_words = {'i', 'want', 'to', 'an', 'on', 'the', 'a', 'and', 'or'}
        words = [word for word in re.sub(r'[^\w\s]', '', query_text).lower().split() if word not in stop_words]
        ts_query = ' | '.join(f'{word}:*' for word in words) if words else '*:*'
        
        query = {
            'query_text': ts_query,
            'query_embedding': query_embedding,
            'limit_rows': limit_rows,
            'offset_rows': offset_rows
        }
        print("Query", query)
        response = self.supabase.rpc(
            'hybrid_search_chunks',
            {
                'query_text': ts_query,
                'query_embedding': query_embedding,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        print("hybrid_search resp:", response)
        
        # Fallback to embedding-only search if no results
        if not response.data:
            print("No chunks found. Falling back to embedding-only search.")
            return self.search(
                query_embedding=query_embedding,
                limit_rows=limit_rows,
                offset_rows=offset_rows
            )
        
        return [(r['id'], r['content'], r['embedding_id'], r['similarity'], r['text_rank']) for r in response.data]

    def search_chunks(
        self,
        query_embedding: Union[List[float], np.ndarray],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, int, float]]:
        """
        Search chunks using only embedding similarity.
        Returns list of (id, content, embedding_id, similarity) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        response = self.supabase.rpc(
            'search_chunks',
            {
                'query_embedding': query_embedding,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        print("search_chunks resp:", response)
        return [(r['id'],r['content'], r['embedding_id'], r['similarity']) for r in response.data]

    def search_documents(
        self,
        query_embedding: Union[List[float], np.ndarray],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, str, float]]:
        """
        Search at document level using embedding similarity.
        Returns list of (id, title, file_path, similarity) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        response = self.supabase.rpc(
            'search_documents',
            {
                'query_embedding': query_embedding,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        print("search_docs resp:", response)
        return response.data