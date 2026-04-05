import { Feed } from '../../components/feed/Feed';
import LeftBar from '../../components/leftBar/leftBar';
import { HomeRightBar } from '../../components/rightBar/home-right-bar/HomeRightBar';
import { Topbar } from '../../components/topbar/Topbar';
import './home.css';
export const Home = () => {
  return (
    <>
      <Topbar />
      <section className="home-container">
        <LeftBar />
        <Feed />
        <HomeRightBar />
      </section>
    </>
  );
};
