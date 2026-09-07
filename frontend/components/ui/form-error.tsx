type FormErrorProps = {
  message?: string | null;
};

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="w-full text-center text-sm font-normal font-['Inter'] leading-5 text-error">
      {message}
    </div>
  );
}
