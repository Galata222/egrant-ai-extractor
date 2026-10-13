from pydantic import BaseModel, Field


class TagValue(BaseModel):
    tag: str
    label: str
    value: str | None
    confidence: float
    needs_review: bool
    required: bool
    # Which extracted field the tag holds ("ico", "issue_date"), so a value typed
    # by a person can be checked the same way as a value read from the document.
    key: str | None = None


class Item(BaseModel):
    id: str
    tags: list[TagValue]


class Section(BaseModel):
    id: str
    title: str
    items: list[Item]
    role: str | None = None


class Root(BaseModel):
    id: str
    sections: list[Section]


class Tree(BaseModel):
    roots: list[Root]


class ExtractionResponse(BaseModel):
    document_id: str
    needs_review: list[str] = Field(default_factory=list)
    document_kind: str = "invoice"
    page_preview: str = ""
    tree: Tree
