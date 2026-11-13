import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PhoneCountryInput } from "./PhoneCountryInput";

function hiddenValue(container: HTMLElement) {
  return (container.querySelector('input[name="phone"]') as HTMLInputElement).value;
}

describe("PhoneCountryInput", () => {
  it("starts in Bolivia and only accepts digits", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhoneCountryInput id="phone" name="phone" />);

    expect(screen.getByLabelText("Código de país")).toHaveValue("BO");
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "numeric");

    await user.type(input, "7a0b0-12 345999");

    expect(input).toHaveValue("70012345");
    expect(hiddenValue(container)).toBe("59170012345");
  });

  it("splits a saved number and handles a pasted one with country code", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhoneCountryInput id="phone" name="phone" defaultValue="70000000" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("70000000");

    await user.clear(input);
    await user.click(input);
    await user.paste("+591 711-22334");

    expect(input).toHaveValue("71122334");
    expect(hiddenValue(container)).toBe("59171122334");
  });

  it("uses the code of the chosen country", async () => {
    const user = userEvent.setup();
    const { container } = render(<PhoneCountryInput id="phone" name="phone" />);

    await user.selectOptions(screen.getByLabelText("Código de país"), "AR");
    await user.type(screen.getByRole("textbox"), "91123456789");

    expect(hiddenValue(container)).toBe("5491123456789");
  });
});
