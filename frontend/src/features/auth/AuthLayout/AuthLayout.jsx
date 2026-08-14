import { Group, Text, Title } from '@mantine/core';
import { LanguageToggle } from '../../../components/ui/LanguageToggle/LanguageToggle';
import { ThemeToggle } from '../../../components/ui/ThemeToggle/ThemeToggle';
import loginIllustration from '../../../assets/login.png';
import styles from './AuthLayout.module.css';

export function AuthLayout({ title, description, children, illustration = false }) {
  return <main className={`${styles.layout} ${illustration ? styles.layoutWithIllustration : ''} bg-gray-50 dark:bg-dark-8`}>
    <section className={styles.formPane}>
      <Group className={styles.controls} gap="xs"><LanguageToggle /><ThemeToggle /></Group>
      <div className={`${styles.card} rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-5 dark:bg-dark-7 sm:p-8`}>
        {illustration && <div className="mb-6 flex justify-center lg:hidden"><div className="grid size-16 place-items-center rounded-2xl bg-blue-50 dark:bg-dark-8"><img src={loginIllustration} alt="" className="h-10 w-12 object-contain" /></div></div>}
        <Title order={1} className="text-3xl tracking-tight">{title}</Title>{description && <Text c="dimmed" mt="xs">{description}</Text>}{children}
      </div>
    </section>
    {illustration && <section className={`${styles.illustrationPane} relative hidden overflow-hidden bg-blue-600 lg:flex lg:items-center lg:justify-center`}><div className="login-orb login-orb-one absolute -right-28 -top-28 size-96 rounded-full bg-white/10" /><div className="login-orb login-orb-two absolute -bottom-40 left-20 size-[34rem] rounded-full bg-blue-300/20" /><div className="login-orb login-orb-three absolute bottom-28 right-24 size-40 rounded-full border border-white/20" /><div className="relative z-10 flex flex-col items-center"><div className="grid size-56 place-items-center rounded-[2rem] bg-white shadow-2xl"><img src={loginIllustration} alt="" className="h-36 w-40 object-contain" /></div><Title order={2} className="mt-8 text-5xl text-white">{title}</Title></div></section>}
  </main>;
}
