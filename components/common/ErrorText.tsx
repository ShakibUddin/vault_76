import React from "react";

type Props = {
  message: string;
};

const ErrorText = ({ message }: Props) => {
  return <p className="text-error text-sm text-center mb-2">{message}</p>;
};

export default ErrorText;
