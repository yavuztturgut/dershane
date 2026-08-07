import { MantineProvider } from '@mantine/core';
import { useForm } from '@mantine/form';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from './UserForm';

function FormHarness() {
  const form = useForm({
    initialValues: { role_id: '3', class_id: '', name: '', email: '', password: '', status: 1 },
  });
  return <UserForm
    form={form}
    roleOptions={[{ value: '3', label: 'Student' }]}
    classOptions={[{ value: '1', label: 'Class A' }]}
    saving={false}
    onCancel={vi.fn()}
    onSubmit={vi.fn()}
    t={(key) => ({ role: 'Role', class: 'Class', name: 'Name', email: 'Email', password: 'Password', active: 'Active', cancel: 'Cancel', save: 'Save' })[key] || key}
  />;
}

describe('UserForm class selection', () => {
  it('shows the clear control only when a class is selected', async () => {
    render(<MantineProvider><FormHarness /></MantineProvider>);
    const classInput = screen.getByRole('combobox', { name: 'Class' });
    const classSelect = classInput.closest('.mantine-Select-root');
    expect(classSelect.querySelector('button')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(classInput);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(classSelect.querySelector('button')).toBeInTheDocument();

    await user.click(classSelect.querySelector('button'));
    expect(classInput).toHaveValue('');
    expect(classSelect.querySelector('button')).not.toBeInTheDocument();
  });
});
