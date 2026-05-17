import HomePageLayout  from '../../layout/HomePageLayout';
import { Hero } from './components/Hero';
import { Tabs } from './components/Tabs';
import { Mockup } from './components/Mockup';

export default function HomePage() {
  return (
    <HomePageLayout>
      <Hero />
      <div className="bg-[#F6F8FA] w-full pt-0 rounded-t-[3rem] px-4 md:px-0">
        <Tabs />
        <div className="pt-24 md:pt-32">
          <Mockup />
        </div>
      </div>
    </HomePageLayout>
  );
}

