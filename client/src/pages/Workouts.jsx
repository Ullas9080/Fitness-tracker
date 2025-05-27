import React, { useEffect, useState, useContext } from "react";
import styled from "styled-components";
import WorkoutCard from "../components/cards/WorkoutCard";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers";
import { getWorkouts } from "../api";
import { CircularProgress } from "@mui/material";
import { WorkoutContext } from "./WorkoutContext";

// ✅ Step Counter Component
const StepCard = styled.div`
  background: white;
  padding: 16px;
  border-radius: 14px;
  box-shadow: 1px 6px 20px 0px ${({ theme }) => theme.primary + 15};
  text-align: center;
`;

const StepCounter = () => {
  const [steps, setSteps] = useState(0);
  const [lastAcc, setLastAcc] = useState(0);
  const threshold = 12;

  useEffect(() => {
    const handleMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

      if (Math.abs(totalAcc - lastAcc) > threshold) {
        setSteps((prev) => prev + 1);
      }

      setLastAcc(totalAcc);
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    } else {
      alert('DeviceMotionEvent is not supported on this device');
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [lastAcc]);

  return (
    <StepCard>
      <h3 className="text-lg font-semibold text-gray-700">Step Counter</h3>
      <p className="text-2xl font-bold text-green-600">{steps} Steps</p>
      <p className="text-sm text-gray-500">Move your device to simulate steps</p>
    </StepCard>
  );
};

const Container = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  justify-content: center;
  padding: 22px 0px;
  overflow-y: scroll;
  background-color: #F5F7FA;
  @media (max-width: 600px) {
    padding: 12px 0px;
  }
`;
const Wrapper = styled.div`
  flex: 1;
  max-width: 1600px;
  display: flex;
  gap: 22px;
  padding: 0px 16px;
  @media (max-width: 600px) {
    gap: 12px;
    flex-direction: column;
  }
`;
const Left = styled.div`
  flex: 0.2;
  height: fit-content;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.text_primary + 20};
  border-radius: 14px;
  box-shadow: 1px 6px 20px 0px ${({ theme }) => theme.primary + 15};
  background: #FFFFFF;
`;
const Title = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.primary};
  @media (max-width: 600px) {
    font-size: 14px;
  }
`;
const Right = styled.div`
  flex: 1;
`;
const CardWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 100px;
  @media (max-width: 600px) {
    gap: 12px;
  }
`;
const Section = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px 16px;
  gap: 22px;
  @media (max-width: 600px) {
    gap: 12px;
  }
`;
const SecTitle = styled.div`
  font-size: 22px;
  color: ${({ theme }) => theme.text_primary};
  font-weight: 500;
`;

const WorkoutCounts = () => {
  const { counts } = useContext(WorkoutContext);
  return (
    <div className="flex flex-col gap-4 w-full lg:w-80">
      {/* Existing Counts */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Hand Lifts</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.handLifts}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Eye Blinks</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.eyeBlinks}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Push-Ups</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.pushUps}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">High Jumps</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.highJumps}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Squats</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.squats}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Jumping Jacks</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.jumpingJacks}</p>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Lunges</h3>
        <p className="text-2xl font-bold text-blue-600">{counts.lunges}</p>
      </div>

      {/* ✅ Added Step Counter */}
      <StepCounter />
    </div>
  );
};

const Workouts = () => {
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");

  const getTodaysWorkout = async () => {
    setLoading(true);
    const token = localStorage.getItem("fittrack-app-token");
    await getWorkouts(token, date ? `?date=${date}` : "").then((res) => {
      setTodaysWorkouts(res?.data?.todaysWorkouts);
      setLoading(false);
    });
  };

  useEffect(() => {
    getTodaysWorkout();
  }, [date]);

  return (
    <Container>
      <Wrapper>
        <Left>
          <Title>Select Date</Title>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              onChange={(e) => setDate(`${e.$M + 1}/${e.$D}/${e.$y}`)}
            />
          </LocalizationProvider>
        </Left>
        <Right>
          <Section>
            <SecTitle>Workout Counts</SecTitle>
            <WorkoutCounts />
          </Section>
          <Section>
            <SecTitle>Todays Workout</SecTitle>
            {loading ? (
              <CircularProgress />
            ) : (
              <CardWrapper>
                {todaysWorkouts.map((workout) => (
                  <WorkoutCard key={workout.id} workout={workout} />
                ))}
              </CardWrapper>
            )}
          </Section>
        </Right>
      </Wrapper>
    </Container>
  );
};

export default Workouts;
