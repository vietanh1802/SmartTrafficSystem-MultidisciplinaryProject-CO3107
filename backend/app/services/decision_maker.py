# backend/services/decision_maker.py

"""
DecisionMaker

Determines how long the current traffic light phase should remain green.

The system assumes two fixed phases:

Phase NS → north and south
Phase EW → east and west

Enhancements implemented
------------------------
1. Normalization of weighted vehicle score
2. Green duration stabilization (anti-oscillation)
"""

from ..models.traffic_state import TrafficState


class DecisionMaker :

    def __init__(self, alpha : float = 0.6,
                 beta : float = 0.4,
                 base_time : float = 10.0,
                 k : float = 40.0,
                 min_green : float = 10.0,
                 max_green : float = 60.0,
                 max_weighted_score : float = 200.0,
                 smoothing_factor : float = 0.4,
                 max_change : float = 10.0) :
        """
        Parameters
        ----------
        alpha, beta         : priority weights
        base_time           : minimum base green time
        k                   : scaling factor for priority → seconds
        max_weighted_score  : expected maximum weighted score for normalization
        smoothing_factor    : exponential smoothing coefficient
        max_change          : maximum allowed change in duration per cycle
        """

        self.alpha = alpha
        self.beta = beta

        self.base_time = base_time
        self.k = k

        self.min_green = min_green
        self.max_green = max_green

        self.max_weighted_score = max_weighted_score

        self.smoothing_factor = smoothing_factor
        self.max_change = max_change

        # store previous duration for smoothing
        self.previous_duration = base_time


    def _normalize_weighted_score(self, weighted_score : float) :
        """
        Normalize weighted vehicle score to [0, 1].
        """
        normalized = weighted_score / self.max_weighted_score
        return min(normalized, 1.0)


    def _compute_priority(self, weighted_score : float, density : float) :
        """
        Compute priority using normalized metrics.
        """
        normalized_score = self._normalize_weighted_score(weighted_score)
        priority = (self.alpha * normalized_score + self.beta * density)
        return priority


    def _environment_factor(self, temperature : float, light : float) :
        """
        Environmental adjustment factor.
        """

        factor = 1.0

        if temperature > 35 :
            factor += 0.10

        if light > 900 :
            factor += 0.05

        return factor


    def _aggregate_phase(self, traffic_state : TrafficState, phase : str) :
        """
        Combine two directions into one phase.
        """

        if phase == "NS" :
            weighted_score = (
                traffic_state.north.weighted_vehicle_score + traffic_state.south.weighted_vehicle_score
            )
            density = (traffic_state.north.density_ratio + traffic_state.south.density_ratio) / 2

        else :
            weighted_score = (
                traffic_state.east.weighted_vehicle_score + traffic_state.west.weighted_vehicle_score
            )
            density = (traffic_state.east.density_ratio + traffic_state.west.density_ratio) / 2

        return weighted_score, density


    def _smooth_duration(self, new_duration : float) :
        """
        Apply exponential smoothing.
        """
        smoothed = (self.smoothing_factor * new_duration + (1 - self.smoothing_factor) * self.previous_duration)
        return smoothed


    def _limit_change(self, duration : float) :
        """
        Limit maximum change between cycles.
        """

        difference = duration - self.previous_duration

        if difference > self.max_change :
            duration = self.previous_duration + self.max_change
        elif difference < -self.max_change :
            duration = self.previous_duration - self.max_change

        return duration
    
    
    def decide(self, traffic_state : TrafficState, current_phase : str) :
        """
        Determine green duration for the current phase.
        """

        print("\n==============================")
        print("TRAFFIC DECISION ENGINE")
        print("==============================")

        weighted_score, density = self._aggregate_phase(traffic_state, current_phase)

        print("\n[Phase Aggregation]")
        print("Phase :", current_phase)
        print("Weighted Score :", weighted_score)
        print("Density :", round(density, 3))

        normalized_score = self._normalize_weighted_score(weighted_score)

        print("\n[Normalization]")
        print("Normalized Score :", round(normalized_score, 3))

        priority = self._compute_priority(weighted_score, density)

        print("\n[Priority Calculation]")
        print("Priority =", round(priority, 3))

        raw_duration = self.base_time + self.k * priority

        print("\n[Raw Duration]")
        print("Base Time :", self.base_time)
        print("k * Priority :", round(self.k * priority, 2))
        print("Raw Duration :", round(raw_duration, 2))

        env_factor = self._environment_factor(
            traffic_state.temperature,
            traffic_state.light_intensity
        )

        print("\n[Environment Adjustment]")
        print("Temperature :", traffic_state.temperature)
        print("Light :", traffic_state.light_intensity)
        print("Factor :", env_factor)

        duration = raw_duration * env_factor

        print("After Environment :", round(duration, 2))

        duration = self._smooth_duration(duration)

        print("\n[Smoothing]")
        print("Previous Duration :", round(self.previous_duration, 2))
        print("Smoothed Duration :", round(duration, 2))

        duration = self._limit_change(duration)

        print("\n[Change Limiting]")
        print("Limited Duration :", round(duration, 2))

        duration = max(self.min_green, duration)
        duration = min(self.max_green, duration)

        print("\n[Final Clamp]")
        print("Final Duration :", round(duration, 2))

        self.previous_duration = duration

        print("==============================\n")

        return { "phase" : current_phase, "green_duration" : round(duration, 2) }


# # backend/app/services/decision_maker.py

# """
# DecisionMaker

# Nhận chỉ số từ AI (weighted_vehicle_score, density_ratio)
# và môi trường IoT (temperature, light_intensity),
# tính thời gian đèn xanh cho pha hiện tại.

# Hai pha cố định:
#     NS => north + south
#     EW => east  + west
# """

# from ..models.traffic_state import TrafficState


# class DecisionMaker:

#     def __init__(self,
#                  alpha: float = 0.6,
#                  beta: float = 0.4,
#                  gamma: float = 0.2,
#                  base_time: float = 10.0,
#                  k: float = 40.0,
#                  min_green: float = 10.0,
#                  max_green: float = 60.0,
#                  max_weighted_score: float = 200.0,
#                  smoothing_factor: float = 0.4,
#                  max_change: float = 10.0):

#         self.alpha = alpha                            # trọng số weighted_vehicle_score (từ AI)
#         self.beta = beta                              # trọng số density_ratio (từ AI)
#         self.gamma = gamma                            # trọng số môi trường (từ IoT)
#         self.base_time = base_time                    # thời gian xanh cơ bản (giây)
#         self.k = k                                    # hệ số nhân priority => giây
#         self.min_green = min_green                    # clamp dưới
#         self.max_green = max_green                    # clamp trên
#         self.max_weighted_score = max_weighted_score  # chuẩn hóa weighted score
#         self.smoothing_factor = smoothing_factor      # hệ số làm mượt (0~1)
#         self.max_change = max_change                  # giới hạn thay đổi mỗi chu kỳ

#         self.previous_duration = base_time


#     def get_light_states(self, winner_phase: str) -> dict:
#         """Trả về trạng thái đèn cho 4 hướng dựa trên pha thắng."""
#         if winner_phase == "NS":
#             return {"north": "green", "south": "green", "east": "red",   "west": "red"}
#         else:
#             return {"north": "red",   "south": "red",   "east": "green", "west": "green"}


#     def decide(self, traffic_state: TrafficState, current_phase: str) -> dict:
#         """
#         Tính thời gian đèn xanh cho pha hiện tại.

#         Luồng:
#             Camera ảnh
#                 => AIService.analyze_multiple_images()
#                 => TrafficState
#                 => DecisionMaker.decide()
#                 => { phase, green_duration }

#         Returns
#         -------
#         dict: { "phase": str, "green_duration": float }
#         """

#         # 1. Gộp chỉ số AI của 2 hướng thành 1 pha
#         if current_phase == "NS":
#             weighted_score = traffic_state.north.weighted_vehicle_score + traffic_state.south.weighted_vehicle_score
#             density = (traffic_state.north.density_ratio + traffic_state.south.density_ratio) / 2
#         else:  # EW
#             weighted_score = traffic_state.east.weighted_vehicle_score + traffic_state.west.weighted_vehicle_score
#             density = (traffic_state.east.density_ratio + traffic_state.west.density_ratio) / 2

#         # 2. Chuẩn hóa tất cả về [0, 1]
#         normalized_score = min(weighted_score / self.max_weighted_score, 1.0)
#         temp_score = min(max((traffic_state.temperature - 20.0) / 20.0, 0.0), 1.0)
#         light_score = min(max((traffic_state.light_intensity - 400.0) / 800.0, 0.0), 1.0)
#         environment_score = (temp_score + light_score) / 2

#         # 3. Priority tổng hợp
#         total_weight = self.alpha + self.beta + self.gamma or 1.0
#         priority = (self.alpha * normalized_score + self.beta * density + self.gamma * environment_score) / total_weight

#         # 4. Tính duration, làm mượt, giới hạn thay đổi, clamp
#         duration = self.base_time + self.k * priority

#         duration = (self.smoothing_factor * duration + (1 - self.smoothing_factor) * self.previous_duration)

#         diff = duration - self.previous_duration
#         if diff > self.max_change:
#             duration = self.previous_duration + self.max_change
#         elif diff < -self.max_change:
#             duration = self.previous_duration - self.max_change

#         duration = max(self.min_green, min(self.max_green, duration))

#         self.previous_duration = duration

#         return {"phase": current_phase, "green_duration": round(duration, 2)}