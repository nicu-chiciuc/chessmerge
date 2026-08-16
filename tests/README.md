# Testing Setup for ChessMerge

This directory contains the test suite for the ChessMerge chess game built with Convex and React.

## Testing Framework

We use **Vitest** as our testing framework, which is fast, modern, and has excellent TypeScript support. It's compatible with Jest APIs but optimized for Vite-based projects.

## Current Test Coverage

### Game Logic Tests (`gameLogic.test.ts`)

Our main test suite covers the core chess game logic functions:

- **Board Initialization**: Tests that the chess board is properly initialized with pieces in correct positions
- **Position Validation**: Tests the `isValidPosition` function for boundary checking
- **Piece Merging Rules**: Tests the `canMerge` function to ensure kings cannot merge
- **Piece Movement**: Comprehensive tests for each piece type:
  - Pawn: Forward movement, double-move from starting position, blocking
  - Rook: Horizontal/vertical movement, path blocking
  - Knight: L-shaped movement patterns
  - King: One-square movement in all directions, no merging
- **Check Detection**: Tests for `isInCheck` function in various scenarios
- **Cell Operations**: Tests for `getAllMovesForCell` and `canCellUnmerge` functions

### Test Coverage Stats

Current coverage for `gameLogic.ts`: **62.75%**

## Running Tests

### Available Commands

```bash
# Run tests in watch mode (default)
pnpm test

# Run tests once and exit
pnpm run test:run

# Run tests with coverage report
pnpm run test:coverage

# Run tests with UI interface
pnpm run test:ui

# Run tests in watch mode
pnpm run test:watch
```

### Watch Mode
By default, `pnpm test` runs in watch mode, which automatically re-runs tests when files change. This provides fast feedback during development.

### Coverage Reports
The coverage report shows:
- **Statement Coverage**: Percentage of code statements executed
- **Branch Coverage**: Percentage of conditional branches taken
- **Function Coverage**: Percentage of functions called
- **Line Coverage**: Percentage of lines executed

Coverage reports are generated in multiple formats:
- Console output
- JSON format
- HTML report (accessible via browser)

## Test Structure

### Game Logic Tests
Pure function tests that don't require database access. These test the core chess logic:
- Board state management
- Move validation
- Game rule enforcement
- Check/checkmate detection

### Testing Patterns Used

1. **Unit Tests**: Testing individual functions in isolation
2. **Test Data Setup**: Creating custom board states for specific scenarios
3. **Edge Case Testing**: Testing boundary conditions and invalid inputs
4. **Behavioral Testing**: Testing expected game behavior

## Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Environment**: Node.js (for server-side logic)
- **Globals**: Enabled for convenience (no need to import test functions)
- **Coverage**: V8 provider with HTML, JSON, and text reporting
- **Single Thread**: Tests run sequentially to avoid conflicts

### TypeScript Configuration
Test files are included in `tsconfig.app.json` to ensure proper type checking.

## Future Testing Opportunities

### 1. Database Integration Tests
For testing Convex mutations and queries, consider:
- User authentication flows
- Game creation and joining
- Move persistence
- Game state management

### 2. Frontend Component Tests
For React components:
- ChessBoard rendering
- Piece interaction
- Move validation UI
- Game status display

### 3. End-to-End Tests
For full application flows:
- User registration and login
- Complete game scenarios
- Multiplayer interactions
- Practice mode

### 4. Performance Tests
- Large board state handling
- Move calculation efficiency
- Memory usage optimization

## Best Practices

### Writing Tests
1. **Descriptive Names**: Test names should clearly describe what they test
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Single Responsibility**: Each test should verify one specific behavior
4. **Edge Cases**: Test boundary conditions and error cases
5. **Isolation**: Tests should not depend on other tests

### Test Data
1. **Custom Board States**: Create specific board configurations for targeted testing
2. **Reusable Helpers**: Extract common test setup into helper functions
3. **Clear Intent**: Test data should make the test's purpose obvious

### Coverage Goals
- Aim for high coverage of critical business logic
- Focus on testing behavior, not just coverage numbers
- Prioritize testing complex or error-prone functions

## Adding New Tests

### For Game Logic
1. Add tests to `gameLogic.test.ts`
2. Create specific board states as needed
3. Test both valid and invalid scenarios
4. Verify edge cases and boundary conditions

### For Database Operations
1. Consider using convex-test library for isolated database testing
2. Test authentication and authorization
3. Verify data persistence and retrieval
4. Test concurrent access scenarios

### For React Components
1. Use @testing-library/react for component testing
2. Test user interactions and state changes
3. Verify proper rendering and accessibility
4. Mock external dependencies

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: pnpm run test:run

- name: Generate Coverage
  run: pnpm run test:coverage
```

## Debugging Tests

### Using Test UI
Run `pnpm run test:ui` to access the visual test interface for:
- Interactive test execution
- Detailed error inspection
- Coverage visualization
- Test file navigation

### Debug Mode
For debugging specific tests:
1. Add `debugger` statements in test code
2. Run tests with `--inspect` flag
3. Use browser dev tools for debugging

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Convex Testing Guide](https://docs.convex.dev/functions/testing)
- [Testing Library](https://testing-library.com/)
- [Jest API Reference](https://jestjs.io/docs/api) (Vitest is Jest-compatible)
