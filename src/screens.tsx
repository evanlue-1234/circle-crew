import { ComponentType } from "react";
import { ScreenId, PlanIntent } from "./navigation";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingAccountScreen } from "./components/OnboardingAccountScreen";
import { OnboardingCompleteScreen } from "./components/OnboardingCompleteScreen";
import { OnboardingLocationScreen } from "./components/OnboardingLocationScreen";
import { OnboardingNameScreen } from "./components/OnboardingNameScreen";
import { OnboardingWelcomeScreen } from "./components/OnboardingWelcomeScreen";
import { SplashScreen } from "./components/SplashScreen";
import { HomeScreen } from "./components/HomeScreen";
import { CircleHubScreen } from "./components/CircleHubScreen";
import { PlansScreen } from "./components/PlansScreen";
import { SetupScreen } from "./components/SetupScreen";
import { InviteScreen } from "./components/InviteScreen";
import { JoinScreen } from "./components/JoinScreen";
import { SpinnerScreen } from "./components/SpinnerScreen";
import { CaptainScreen } from "./components/CaptainScreen";
import { DiscoverScreen } from "./components/DiscoverScreen";
import { PollScreen } from "./components/PollScreen";
import { SwipeScreen } from "./components/SwipeScreen";
import { ShareScreen } from "./components/ShareScreen";
import { PendingScreen } from "./components/PendingScreen";
import { MatchScreen } from "./components/MatchScreen";
import { VoteScreen } from "./components/VoteScreen";
import { CommitScreen } from "./components/CommitScreen";
import { ConfirmedScreen } from "./components/ConfirmedScreen";
import { RhythmScreen } from "./components/RhythmScreen";
import { RecapScreen } from "./components/RecapScreen";
import { MemoriesScreen } from "./components/MemoriesScreen";
import { ProfileScreen } from "./components/ProfileScreen";

export type ScreenProps = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export const screens: Record<ScreenId, ComponentType<ScreenProps>> = {
  splash: SplashScreen,
  login: LoginScreen,
  onboardingWelcome: OnboardingWelcomeScreen,
  onboardingName: OnboardingNameScreen,
  onboardingLocation: OnboardingLocationScreen,
  onboardingAccount: OnboardingAccountScreen,
  onboardingComplete: OnboardingCompleteScreen,
  home: HomeScreen,
  circleHub: CircleHubScreen,
  plans: PlansScreen,
  setup: SetupScreen,
  invite: InviteScreen,
  join: JoinScreen,
  spinner: SpinnerScreen,
  captain: CaptainScreen,
  discover: DiscoverScreen,
  poll: PollScreen,
  swipe: SwipeScreen,
  share: ShareScreen,
  pending: PendingScreen,
  match: MatchScreen,
  vote: VoteScreen,
  commit: CommitScreen,
  confirmed: ConfirmedScreen,
  rhythm: RhythmScreen,
  recap: RecapScreen,
  memories: MemoriesScreen,
  profile: ProfileScreen,
};
