"""
Django management command to index community cultural data into Chroma DB
"""

import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
CULTURAL_DATA_DIR = BASE_DIR / "culturalData"
CHROMA_DIR = BASE_DIR / "chroma_store"


class Command(BaseCommand):
    help = 'Index community cultural data into Chroma vector database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing index before indexing',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting indexing...'))
        
        # Initialize embeddings
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Check if cultural data exists
        if not CULTURAL_DATA_DIR.exists():
            self.stdout.write(self.style.ERROR(f'Cultural data directory not found: {CULTURAL_DATA_DIR}'))
            return
        
        # Clear existing if requested
        if options['clear'] and CHROMA_DIR.exists():
            import shutil
            shutil.rmtree(CHROMA_DIR)
            self.stdout.write('Cleared existing Chroma DB')
        
        # Create Chroma DB
        vector_store = Chroma(
            persist_directory=str(CHROMA_DIR),
            embedding_function=embeddings,
            collection_name="cultural_knowledge"
        )
        
        # Load and index data
        documents = []
        metadatas = []
        
        # Look for JSON files in culturalData directory
        json_files = list(CULTURAL_DATA_DIR.glob('*.json'))
        
        if not json_files:
            self.stdout.write(self.style.WARNING(f'No JSON files found in {CULTURAL_DATA_DIR}'))
            return
        
        for json_file in json_files:
            self.stdout.write(f'Processing {json_file.name}...')
            
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            community = data.get('name', json_file.stem).lower()
            
            # Index each section
            sections = ['origin', 'beliefs', 'practices', 'subtribes', 'language', 'region']
            
            for section in sections:
                content = data.get(section, '')
                if content:
                    if isinstance(content, list):
                        content = ' '.join(content)
                    
                    documents.append(content)
                    metadatas.append({
                        'community': community,
                        'section': section,
                        'source': json_file.name
                    })
            
            # Also index full description if available
            if data.get('description'):
                documents.append(data['description'])
                metadatas.append({
                    'community': community,
                    'section': 'description',
                    'source': json_file.name
                })
        
        # Add documents to vector store
        if documents:
            vector_store.add_texts(documents, metadatas=metadatas)
            vector_store.persist()
            
            self.stdout.write(self.style.SUCCESS(
                f'Successfully indexed {len(documents)} chunks for {len(json_files)} communities'
            ))
        else:
            self.stdout.write(self.style.WARNING('No documents to index'))