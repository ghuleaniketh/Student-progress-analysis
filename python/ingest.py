import fitz  # pymupdf
import chromadb
from chromadb.utils import embedding_functions

chroma_client = chromadb.PersistentClient(path="./chroma_store")

embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)


def get_collection(name: str):
    return chroma_client.get_or_create_collection(
        name=name,
        embedding_function=embedder
    )


def ingest_pdf(pdf_path: str, collection_name: str, chunk_size: int = 400) -> dict:
    doc = fitz.open(pdf_path)
    chunks, ids = [], []

    for page_num, page in enumerate(doc):
        text = page.get_text("text").strip()
        if not text:
            continue

        words = text.split()
        current, char_count, chunk_id = [], 0, 0

        for word in words:
            current.append(word)
            char_count += len(word) + 1
            if char_count >= chunk_size:
                chunks.append(" ".join(current))
                ids.append(f"{collection_name}_p{page_num}_c{chunk_id}")
                current = current[-20:]  # 20-word overlap
                char_count = sum(len(w) + 1 for w in current)
                chunk_id += 1

        if current:
            chunks.append(" ".join(current))
            ids.append(f"{collection_name}_p{page_num}_c{chunk_id}")

    collection = get_collection(collection_name)
    for i in range(0, len(chunks), 100):
        collection.add(
            documents=chunks[i:i + 100],
            ids=ids[i:i + 100]
        )

    return {"chunks_stored": len(chunks), "collection": collection_name}


def query_syllabus(query: str, collection_name: str, n_results: int = 5) -> list[str]:
    try:
        collection = get_collection(collection_name)
        results = collection.query(query_texts=[query], n_results=n_results)
        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []