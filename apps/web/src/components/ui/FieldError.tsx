import { useId } from "react";

export function FieldError({ message, id }: { message?: string; id?: string }) {
  const autoId = useId();
  const errorId = id ?? autoId;

  if (!message) return null;
  return <p id={errorId} className="text-sm text-status-danger">{message}</p>;
}
