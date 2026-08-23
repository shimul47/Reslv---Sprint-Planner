import HelpTip from "../../components/sprintPlanner/HelpTip.jsx";
import FreeNowPanel from "../../components/sprintPlanner/FreeNowPanel.jsx";
import TeamAvailabilityPanel from "../../components/sprintPlanner/TeamAvailabilityPanel.jsx";

export default function AvailabilityView() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <HelpTip title="Availability">
          Shows each teammate's real Google Calendar busy time, so you can plan sprint capacity
          honestly instead of assuming everyone has the full default hours free. "Free Right Now" is
          a live view against the company's working hours (set in Admin → Team Management); anyone
          who hasn't connected their calendar yet can be nudged with a reminder email below.
        </HelpTip>
      </div>
      <FreeNowPanel />
      <TeamAvailabilityPanel />
    </div>
  );
}
