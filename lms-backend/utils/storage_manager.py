# lms-backend/utils/storage_manager.py
from typing import List, Dict, BinaryIO, Optional
from supabase import create_client
import os
from pathlib import Path
import json
from sentence_transformers import SentenceTransformer
# import numpy as np
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredMarkdownLoader,
    NotebookLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
import requests
import tempfile
from urllib.parse import urlparse

class StorageManager:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase = create_client(supabase_url, supabase_key)
        self.embedding_model = SentenceTransformer('thenlper/gte-base')
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

    def get_embedding(self, text: str) -> List[float]:
        """Generate embedding using GTE-base model"""
        embedding = self.embedding_model.encode(text)
        return embedding.tolist()

    def load_file(self, file_path: str):
        """Load different file types from local path or Supabase URL"""
        file_extension = Path(file_path).suffix.lower() if not file_path.startswith('http') else self._get_url_extension(file_path)
        # print("loaded file ext", file_extension)
        loaders = {
            '.pdf': PyPDFLoader,
            '.txt': TextLoader,
            '.docx': Docx2txtLoader,
            '.md': UnstructuredMarkdownLoader
        }

        if file_extension not in loaders:
            raise ValueError(f"Unsupported file type: {file_extension}")

        # Check if file_path is a URL
        if file_path.startswith('http'):
            # Download the file content
            response = requests.get(file_path)
            response.raise_for_status()  # Raise exception for bad status codes

            # Create a temporary file to pass to the loader
            with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name

            try:
                loader = loaders[file_extension](temp_file_path)
                documents = loader.load()
            finally:
                # Clean up the temporary file
                os.unlink(temp_file_path)
        else:
            # Handle local file path
            loader = loaders[file_extension](file_path)
            # print("got loader",loader)
            try:
                documents = loader.load()
            except Exception as e:
                print("err",e)
            # print("loaded using loader")

        return documents

    def _get_url_extension(self, url: str) -> str:
        """Extract file extension from a URL"""
        path = urlparse(url).path
        return Path(path).suffix.lower()

    def process_file(self,
                    file_path: str,
                    course_id: int,
                    originalFilePath: str,
                    folder: Optional[str] = None,
                    ) -> Dict:
        """Process a file and store its embeddings"""

        # 1. Load and split the document
        documents = self.load_file(file_path)
        # print("loaded file", documents)
        splits = self.text_splitter.split_documents(documents)
        # print("split file", splits)

        # 2. Generate document-level embedding
        doc_content = " ".join([split.page_content for split in splits])
        doc_embedding = self.get_embedding(doc_content)

        # Prepare metadata
        if file_path.startswith('http'):
            file_name = self._get_url_extension(file_path).split('/')[-1]
        else:
            file_name = "".join(Path(file_path).name.split("_")[1:])
        metadata = {
            'file_type': Path(file_path).suffix.lower(),
            'total_chunks': len(splits),
            'folder': folder
        }

        # 3. Store document metadata and embedding
        # print("got metadata")
        try:
            doc_response = self.supabase.table('document_embed').insert({
                'course_id': course_id,
                'title': file_name,
                'file_path': originalFilePath,
                'content_type': folder or 'default',
                'total_chunks': len(splits),
                'embedding': doc_embedding,
                'metadata': metadata
            }).execute()
        except Exception as e:
            print("got-exception-uploading-embedding2db",e)
        # print("doc resp", doc_response)

        if not doc_response.data:
            raise Exception("Failed to store document embedding")

        document_id = doc_response.data[0]['id']
        print("doc id", document_id, "num splits", len(splits))

        # 4. Process and store chunks
        chunk_data = []
        for i, split in enumerate(splits):
            chunk_embedding = self.get_embedding(split.page_content)
            # print("got chunk embedding", i)

            chunk_data.append({
                'embedding_id': document_id,
                'content': split.page_content,
                'embedding': chunk_embedding,
                'chunk_index': i,
                'metadata': {
                    'chunk_index': i,
                    'total_chunks': len(splits)
                },
                # "content_tsv": f"to_tsvector('english', '{split.page_content.replace("'", "''")}')"
                # "content_tsv": out_tsv  ###auto generated
            })

        # Batch insert chunks
        # print("chunk data",chunk_data[0])
        try:
            chunk_response = self.supabase.table('chunks_embed').insert(chunk_data).execute()
        except Exception as e:
            print("got-exception-uploading-chunks2db",e)

        # print("chunk resp", chunk_response)

        if not chunk_response.data:
            raise Exception("Failed to store chunk embeddings")

        return {
            "embedding_id": document_id,
            "total_chunks": len(splits),
            "file_name": file_name,
            "folder": folder
        }