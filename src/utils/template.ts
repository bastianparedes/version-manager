const getFilledTemplate = (template: string, variables: Record<string, string | undefined>) => {
  let result = template;
  Object.keys(variables).forEach((key) => {
    const value = variables[key];
    if (value) result = result.replaceAll(`{${key}}`, value);
  });
  return result;
};

export { getFilledTemplate };
