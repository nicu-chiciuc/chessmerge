# Design: [Feature Name]

## Related Requirements
- `specs/requirements/[requirement-file].md`

## Architecture Overview

Brief description of the overall approach and why it was chosen.

## Component Structure

```
ComponentName/
├── ComponentName.tsx      # Main component
├── useComponentHook.ts    # Custom hooks
├── types.ts               # Type definitions
└── utils.ts               # Helper functions
```

## Data Flow

```
[Source] → [Transform] → [Destination]
```

Describe how data moves through the system.

## Component Hierarchy

```
ParentComponent
├── ChildComponent1
│   └── GrandchildComponent
└── ChildComponent2
```

## State Design

### Local State
```typescript
const [stateName, setStateName] = useState<Type>(initialValue);
```

### Shared State (if applicable)
- Context or global state structure
- When state updates propagate

## Database Schema (if applicable)

```typescript
// Convex table definition
export const tableName = defineTable({
  field1: v.string(),
  field2: v.number(),
})
  .index("by_field1", ["field1"])
```

## API Design

### Queries
```typescript
// query name and signature
export const queryName = query({
  args: { /* args */ },
  handler: async (ctx, args) => { /* returns */ }
});
```

### Mutations
```typescript
// mutation name and signature
export const mutationName = mutation({
  args: { /* args */ },
  handler: async (ctx, args) => { /* returns */ }
});
```

## UI/UX Considerations

- Layout approach
- Responsive behavior
- Accessibility requirements
- Animation/transitions

## Performance Considerations

- Caching strategy
- Lazy loading
- Optimization opportunities

## Security Considerations

- Authorization checks
- Input validation
- Data exposure risks

## Alternatives Considered

### Alternative 1: [Name]
- Pros: ...
- Cons: ...
- Why rejected: ...

## Migration/Rollout Plan (if applicable)

1. Step 1
2. Step 2
3. Step 3
