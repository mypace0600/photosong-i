type FeedbackMessageProps = {
  error?: string;
  success?: string;
  className?: string;
};

export function FeedbackMessage({
  error,
  success,
  className = "mt-4",
}: FeedbackMessageProps) {
  if (error) {
    return (
      <p
        className={`${className} rounded-[8px] bg-[#fff2f2] p-3 text-sm font-bold leading-5 text-[#a33535]`}
      >
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p
        className={`${className} rounded-[8px] bg-[#eff8ea] p-3 text-sm font-bold leading-5 text-[#37652c]`}
      >
        {success}
      </p>
    );
  }

  return null;
}
