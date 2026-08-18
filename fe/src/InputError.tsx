type Props = {
  message?: string;
};

export default function InputError({ message }: Props) {
  if (!message) return null;

  return (
    <p style={{ color: "red", fontSize: "14px" }}>
      {message}
    </p>
  );
}