# 🔀 GraphQL API DESIGN COMPLETE GUIDE

## Modern API Architecture Alternative to REST

---

## 📋 TABLE OF CONTENTS

1. [What is GraphQL](#-what-is-graphql)
2. [GraphQL vs REST](#-graphql-vs-rest)
3. [Schema Design](#-schema-design)
4. [Queries and Mutations](#-queries-and-mutations)
5. [Resolvers](#-resolvers)
6. [The N+1 Problem](#-the-n1-problem)
7. [Authentication & Authorization](#-authentication--authorization)
8. [Subscriptions (Real-time)](#-subscriptions-real-time)
9. [Best Practices](#-best-practices)

---

## 🎯 WHAT IS GRAPHQL

### Definition

GraphQL is a **query language for APIs** and a **runtime for executing queries**. Unlike REST, clients specify exactly what data they need.

### Key Concepts

| Concept          | Description                        | Example                   |
| ---------------- | ---------------------------------- | ------------------------- |
| **Schema**       | Contract between client and server | Type definitions          |
| **Query**        | Read data                          | `{ user { name } }`       |
| **Mutation**     | Write/modify data                  | `createUser(name: "...")` |
| **Subscription** | Real-time updates                  | Live comment feed         |
| **Resolver**     | Functions that fetch data          | Database queries          |

### Why GraphQL Exists

```
Traditional REST Problem:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ /users/1   │     │ /users/1/  │     │ /users/1/  │
│            │     │  posts     │     │  followers │
└────────────┘     └────────────┘     └────────────┘
     │                  │                   │
     └──────────────────┴───────────────────┘
                 3 requests!

GraphQL Solution:
┌────────────────────────────────────────┐
│ query {                                │
│   user(id: 1) {                        │
│     name                               │
│     posts { title }                    │
│     followers { name }                 │
│   }                                    │
│ }                                      │
└────────────────────────────────────────┘
              1 request!
```

---

## ⚔️ GRAPHQL VS REST

### Comparison Table

| Feature            | REST                    | GraphQL                    |
| ------------------ | ----------------------- | -------------------------- |
| **Data Fetching**  | Fixed endpoints         | Client specifies fields    |
| **Over-fetching**  | Common                  | Eliminated                 |
| **Under-fetching** | Requires multiple calls | Single request             |
| **Versioning**     | URL-based (/v1, /v2)    | Schema evolution           |
| **Caching**        | HTTP caching (easy)     | Query caching (complex)    |
| **Learning Curve** | Lower                   | Higher                     |
| **Tooling**        | Mature                  | Growing rapidly            |
| **Error Handling** | HTTP status codes       | Always 200, errors in body |

### When to Use GraphQL

✅ **Use GraphQL when**:

- Multiple clients need different data shapes
- Mobile apps (bandwidth optimization)
- Complex data relationships
- Rapid iteration on data requirements

❌ **Stick with REST when**:

- Simple CRUD operations
- Public APIs with heavy caching needs
- Team unfamiliar with GraphQL
- File uploads are primary use case

---

## 📐 SCHEMA DESIGN

### Type Definitions

```graphql
# Schema Definition Language (SDL)

# Scalar types: String, Int, Float, Boolean, ID

type User {
  id: ID! # Non-nullable
  email: String!
  name: String
  posts: [Post!]! # Non-null list of non-null Posts
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String
  author: User!
  comments: [Comment!]!
  publishedAt: DateTime
}

type Comment {
  id: ID!
  text: String!
  author: User!
  post: Post!
}

# Input types for mutations
input CreatePostInput {
  title: String!
  content: String
}

# Enums
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

# Interface
interface Node {
  id: ID!
}

# Union type
union SearchResult = User | Post | Comment
```

### Query and Mutation Types

```graphql
type Query {
  # Get single user
  user(id: ID!): User

  # Get list with pagination
  users(first: Int, after: ID): UserConnection!

  # Search
  search(query: String!): [SearchResult!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!

  createPost(input: CreatePostInput!): Post!
}

type Subscription {
  postCreated: Post!
  commentAdded(postId: ID!): Comment!
}
```

---

## 🔍 QUERIES AND MUTATIONS

### Query Examples

```graphql
# Simple query
query GetUser {
  user(id: "123") {
    name
    email
  }
}

# Query with nested data
query GetUserWithPosts {
  user(id: "123") {
    name
    posts {
      title
      publishedAt
      comments {
        text
        author {
          name
        }
      }
    }
  }
}

# Query with arguments and aliases
query ComparePosts {
  firstPost: post(id: "1") {
    title
    ...PostDetails
  }
  secondPost: post(id: "2") {
    title
    ...PostDetails
  }
}

# Fragment for reusable selections
fragment PostDetails on Post {
  content
  author {
    name
  }
  publishedAt
}

# Variables
query GetUser($userId: ID!) {
  user(id: $userId) {
    name
    email
  }
}
```

### Mutation Examples

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    author {
      name
    }
  }
}

# Variables:
# {
#   "input": {
#     "title": "My Post",
#     "content": "Hello World"
#   }
# }
```

---

## ⚙️ RESOLVERS

### Python Implementation (Graphene-Django)

```python
import graphene
from graphene_django import DjangoObjectType
from .models import User, Post

class UserType(DjangoObjectType):
    class Meta:
        model = User
        fields = ('id', 'name', 'email', 'posts')

class PostType(DjangoObjectType):
    class Meta:
        model = Post
        fields = ('id', 'title', 'content', 'author')

class Query(graphene.ObjectType):
    user = graphene.Field(UserType, id=graphene.ID(required=True))
    users = graphene.List(UserType)

    def resolve_user(self, info, id):
        return User.objects.get(id=id)

    def resolve_users(self, info):
        return User.objects.all()

class CreatePost(graphene.Mutation):
    class Arguments:
        title = graphene.String(required=True)
        content = graphene.String()

    post = graphene.Field(PostType)

    def mutate(self, info, title, content=None):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Authentication required")

        post = Post.objects.create(
            title=title,
            content=content,
            author=user
        )
        return CreatePost(post=post)

class Mutation(graphene.ObjectType):
    create_post = CreatePost.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
```

---

## 🔁 THE N+1 PROBLEM

### The Problem

```python
# BAD: N+1 queries
# 1 query for posts, N queries for each author
def resolve_posts(self, info):
    posts = Post.objects.all()  # Query 1
    # For each post, Django fetches author separately!
    return posts
```

### The Solution: DataLoader

```python
from promise import Promise
from promise.dataloader import DataLoader

class UserLoader(DataLoader):
    def batch_load_fn(self, user_ids):
        """Load all users in one query."""
        users = User.objects.filter(id__in=user_ids)
        user_map = {user.id: user for user in users}
        return Promise.resolve([
            user_map.get(user_id) for user_id in user_ids
        ])

# In resolver
def resolve_author(self, info):
    return info.context.user_loader.load(self.author_id)

# Setup in view
class GraphQLView:
    def get_context(self, request):
        return {
            'user_loader': UserLoader(),
            'request': request,
        }
```

### Django ORM Alternative

```python
# Use select_related / prefetch_related
def resolve_posts(self, info):
    return Post.objects.select_related('author').prefetch_related('comments')
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### JWT Authentication

```python
import jwt
from django.conf import settings

def get_user_from_token(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return User.objects.get(id=payload['user_id'])
    except (jwt.ExpiredSignatureError, User.DoesNotExist):
        return None

class AuthenticatedGraphQLView(GraphQLView):
    def get_context(self, request):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user = get_user_from_token(token) if token else None
        return {'request': request, 'user': user}
```

### Field-Level Authorization

```python
class PostType(DjangoObjectType):
    internal_notes = graphene.String()

    def resolve_internal_notes(self, info):
        user = info.context.user
        if not user or not user.is_staff:
            return None  # Or raise exception
        return self.internal_notes
```

### Directive-Based Auth

```graphql
directive @auth(role: Role!) on FIELD_DEFINITION

type Query {
  users: [User!]! @auth(role: ADMIN)
  myProfile: User! @auth(role: USER)
}
```

---

## ⚡ SUBSCRIPTIONS (REAL-TIME)

### Django Channels Integration

```python
# consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class GraphQLSubscriptionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.channel_layer.group_add("posts", self.channel_name)

    async def post_created(self, event):
        await self.send_json({
            'type': 'subscription_data',
            'data': event['post']
        })

# Trigger from mutation
async def notify_post_created(post):
    channel_layer = get_channel_layer()
    await channel_layer.group_send("posts", {
        "type": "post_created",
        "post": {"id": post.id, "title": post.title}
    })
```

---

## 💎 BEST PRACTICES

### Schema Design

1. **Use non-nullable types wisely** - Only mark fields `!` if truly required
2. **Pagination** - Use Relay-style connections for lists
3. **Input types** - Always use input types for mutations
4. **Versioning** - Deprecate fields instead of versioning

### Performance

1. **Depth limiting** - Prevent deep nesting attacks
2. **Query complexity** - Assign costs to fields
3. **DataLoader** - Always batch database queries
4. **Persisted queries** - Cache query AST for production

```python
# Query complexity limiter
class QueryComplexityValidator:
    max_complexity = 100

    def validate(self, query):
        complexity = self.calculate_complexity(query)
        if complexity > self.max_complexity:
            raise Exception(f"Query too complex: {complexity}")
```

### Security

1. **Rate limiting** - Per-user query limits
2. **Query whitelisting** - Only allow known queries in production
3. **Introspection** - Disable in production
4. **Error messages** - Don't leak internal details

---

**SINGULARITY ENGINE v17.0**  
_"GraphQL: Ask for what you need, get exactly that."_
