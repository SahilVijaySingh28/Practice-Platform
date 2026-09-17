const NAME_PATTERN = /(?:class|interface)\s+([A-Za-z_][A-Za-z0-9_]*)/g;

export function parseDesignText(content) {
  const safeContent = typeof content === 'string' ? content : '';
  const graph = {
    classes: [],
    interfaces: [],
    relationships: []
  };

  if (!safeContent.trim()) {
    return graph;
  }

  const lines = safeContent.split(/\r?\n/);
  let currentClass = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const classMatch = trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) {
      const name = classMatch[1];
      currentClass = { name, fields: [], methods: [] };
      graph.classes.push(currentClass);

      const extendsMatch = trimmed.match(/^class\s+[A-Za-z_][A-Za-z0-9_]*\s+extends\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (extendsMatch) {
        graph.relationships.push({ from: name, to: extendsMatch[1], kind: 'extends' });
      }

      const implementsMatch = trimmed.match(/^class\s+[A-Za-z_][A-Za-z0-9_]*\s+implements\s+([A-Za-z_][A-Za-z0-9_,\s]*)/);
      if (implementsMatch) {
        const targetInterfaces = implementsMatch[1].split(',').map(item => item.trim()).filter(Boolean);
        targetInterfaces.forEach(target => {
          graph.relationships.push({ from: name, to: target, kind: 'implements' });
          if (!graph.interfaces.includes(target)) graph.interfaces.push(target);
        });
      }
      return;
    }

    const interfaceMatch = trimmed.match(/^interface\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (interfaceMatch) {
      const name = interfaceMatch[1];
      if (!graph.interfaces.includes(name)) graph.interfaces.push(name);
      return;
    }

    if (currentClass) {
      const fieldMatch = trimmed.match(/[-+]\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\n]+/);
      if (fieldMatch) {
        currentClass.fields.push(fieldMatch[1]);
        return;
      }

      const methodMatch = trimmed.match(/[-+]\s*([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*(?::\s*[^\n]+)?/);
      if (methodMatch) {
        currentClass.methods.push(methodMatch[1]);
      }
    }
  });

  const allNames = [...safeContent.matchAll(NAME_PATTERN)].map(match => match[1]);
  allNames.forEach(name => {
    if (name && !graph.interfaces.includes(name) && !graph.classes.some(classItem => classItem.name === name)) {
      graph.interfaces.push(name);
    }
  });

  return graph;
}

export function parseSubmission(content) {
  try {
    return parseDesignText(content);
  } catch (error) {
    return { classes: [], interfaces: [], relationships: [] };
  }
}
