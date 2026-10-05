export function responseMessages(body: { message?: string | string[] }) {
  if (Array.isArray(body.message)) {
    return body.message;
  }

  if (typeof body.message === 'string') {
    return [body.message];
  }

  return [];
}

export function expectMessage(
  body: { message?: string | string[] },
  fragment: string,
) {
  const messages = responseMessages(body);
  if (!messages.some((message) => message.includes(fragment))) {
    throw new Error(
      `Expected a message containing "${fragment}", received ${JSON.stringify(body)}`,
    );
  }
}
