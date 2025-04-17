from typing import List, Optional, Tuple, Union
import numpy as np
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
    ) -> List[Tuple[int, str, int, float]]:
        """
        Perform hybrid search (text + embedding) with document filtering.
        Returns list of (id, content, embedding_id, similarity) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        response = self.supabase.rpc(
            'filtered_hybrid_search_chunks',
            {
                'query_text': query_text,
                'query_embedding': query_embedding,
                'relevant_doc_ids': relevant_doc_ids,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        return response.data

    def filtered_search(
        self,
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
            {
                'query_embedding': query_embedding,
                'relevant_doc_ids': relevant_doc_ids,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        return response.data

    def get_document_ids_by_urls(self, urls: List[str]) -> List[int]:
        """Get document IDs for given URLs."""
        response = self.supabase.rpc(
            'get_document_ids_by_urls',
            {'urls': urls}
        ).execute()
        return response.data

    def hybrid_search(
        self,
        query_text: str,
        query_embedding: Union[List[float], np.ndarray],
        limit_rows: int = 10,
        offset_rows: int = 0
    ) -> List[Tuple[int, str, int, float]]:
        """
        Perform hybrid search (text + embedding) without filtering.
        Returns list of (id, content, embedding_id, similarity) tuples.
        """
        query_embedding = self._convert_embedding_to_list(query_embedding)
        response = self.supabase.rpc(
            'hybrid_search_chunks',
            {
                'query_text': query_text,
                'query_embedding': query_embedding,
                'limit_rows': limit_rows,
                'offset_rows': offset_rows
            }
        ).execute()
        return response.data

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
        return response.data

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
        return response.data 