import { test, expect } from "@playwright/test";

const TODO_ITEMS = [
  "buy some cheese",
  "feed the cat",
  "book a doctors appointment",
];

test.beforeEach(async ({ page }) => {
  await page.goto("/todomvc");
});

test.describe("New Todo", () => {
  test("should allow me to add todo items", async ({ page }) => {
    const newTodo = page.getByPlaceholder("What needs to be done?");

    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press("Enter");
    await expect(page.getByTestId("todo-title")).toHaveText([TODO_ITEMS[0]]);

    await newTodo.fill(TODO_ITEMS[1]);
    await newTodo.press("Enter");
    await expect(page.getByTestId("todo-title")).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[1],
    ]);
  });

  test("should clear text input field when an item is added", async ({
    page,
  }) => {
    const newTodo = page.getByPlaceholder("What needs to be done?");

    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press("Enter");
    await expect(newTodo).toBeEmpty();
  });

  test("should show the item counter", async ({ page }) => {
    const newTodo = page.getByPlaceholder("What needs to be done?");

    for (const item of TODO_ITEMS) {
      await newTodo.fill(item);
      await newTodo.press("Enter");
    }
    await expect(page.getByTestId("todo-count")).toContainText("3");
  });
});

test.describe("Mark as completed", () => {
  test("should allow me to mark an item as completed", async ({ page }) => {
    const newTodo = page.getByPlaceholder("What needs to be done?");
    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press("Enter");

    const todo = page.getByTestId("todo-item").first();
    await todo.getByRole("checkbox").check();
    await expect(todo).toHaveClass(/completed/);
  });

  test("should clear completed items", async ({ page }) => {
    const newTodo = page.getByPlaceholder("What needs to be done?");
    for (const item of TODO_ITEMS) {
      await newTodo.fill(item);
      await newTodo.press("Enter");
    }

    await page.getByTestId("todo-item").nth(1).getByRole("checkbox").check();
    await page.getByRole("button", { name: "Clear completed" }).click();
    await expect(page.getByTestId("todo-title")).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[2],
    ]);
  });
});
