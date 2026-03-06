import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./hooks/useAuth", () => ({
  useAuth: () => ({
    session: null,
    authLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock("./lib/supabaseClient", () => ({
  SUPABASE_CONFIG_OK: true,
  supabase: {},
}));

test("smoke: App renders without crashing and shows auth or main UI", () => {
  render(<App />);
  // Sin sesión se muestra AuthScreen con el título de la app
  const title = screen.getByText(/Gluten Free/i);
  expect(title).toBeInTheDocument();
});
