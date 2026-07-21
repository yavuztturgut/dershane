import { Center, Loader } from '@mantine/core';

export function PageLoader({ fullPage = false }) {
  return (
    <Center className={fullPage ? 'min-h-screen' : 'min-h-72'}>
      <Loader size="md" aria-label="Loading" />
    </Center>
  );
}
