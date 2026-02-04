# Spec-Building Prompt

Use this prompt to develop thorough specifications through iterative Q&A.

---

## The Prompt

Copy and paste this when starting a new feature spec:

```
Ask me one question at a time so we can develop a thorough, step-by-step spec for this idea. Each question should build on my previous answers, and our end goal is to have a detailed specification I can hand off to a developer. Let's do this iteratively and dig into every relevant detail. Remember, only one question at a time.

Here's the idea:
<paste your idea here>
```

---

## Why This Works

1. **Uncovers blind spots**: Sequential questions reveal details you hadn't considered
2. **Forces clarity**: You can't skip over vague parts
3. **Builds complete picture**: Each answer adds context for the next question
4. **Creates documentation**: The Q&A becomes part of the spec

---

## After the Q&A

Once the questioning is complete, ask:

```
Now compile everything we discussed into a complete requirement specification following this structure:

1. Feature Overview
2. User Stories
3. Acceptance Criteria
4. Technical Requirements
5. Data Structures (if applicable)
6. Edge Cases and Error Handling
7. Dependencies and Constraints
8. Out of Scope
```

Save the result to `specs/requirements/<feature-name>.md`

---

## Implementation Prompt

Once you have a complete spec, use this to begin implementation:

```
Read the specification at specs/requirements/<feature-name>.md and implement it step by step. After reading, create a task list and begin with the first task. Ask clarifying questions if any requirement is ambiguous.
```
