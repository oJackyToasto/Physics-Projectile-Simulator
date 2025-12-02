# Collision Simulator: Development Notes

## 🌟 Inspiration

This project was inspired by **3Blue1Brown's** video on *"The most unexpected answer to a counting puzzle"* - which reveals how elastic collisions between blocks can mysteriously relate to the digits of **π (pi)**.

When you count collisions between two blocks with specific mass ratios (powers of 100), the result converges to digits of π. This beautiful connection between simple mechanics and transcendental numbers sparked the desire to build an interactive simulation.

---

## 🎯 What It Does

An interactive web-based physics simulation that visualizes elastic collisions between two blocks. Features include:

- Real-time physics simulation with accurate collision calculations
- Interactive controls for masses, velocities, and forces
- Live statistics panel (momentum, kinetic energy, collision count)
- Dual graphs showing velocity and position over time
- Force & friction modes for extended physics exploration
- Adjustable simulation speed

---

## 🚧 Main Challenges

### 1. **Collision Detection & Separation**
Blocks would overlap during collisions, causing visual glitches. Solved by implementing a separation algorithm that immediately corrects positions after collision detection.

### 2. **Time-Based Graph Data**
Graphs initially used frame counts, which broke with variable simulation speeds. Fixed by switching to real-time timestamps, ensuring complete data regardless of speed.

### 3. **Graph Persistence**
Users wanted graphs to persist after a run finished, but reset on new runs. Implemented smart reset logic that preserves data until explicitly starting a new simulation.

### 4. **Layout Management**
Graphs and controls had conflicting width requirements. Solved by positioning graphs above controls, making controls slimmer and centered, while graphs match the canvas width.

### 5. **Force & Friction Integration**
Adding forces without breaking collision physics required careful integration. Created a toggle system that maintains the original constant-velocity mode while adding optional force/friction when enabled.

---

## 📚 Key Learnings

- **Visualizing physics** makes abstract concepts tangible and intuitive
- **State management** is crucial - knowing when to preserve vs. reset data affects user experience
- **Real-time data collection** requires careful timing, especially with variable speeds
- Breaking complex problems into smaller pieces makes them manageable
- The connection between collisions and π reveals deep mathematical structures in simple systems

---

## 🎓 Educational Value

This simulation helps students:
- See physics concepts in action visually
- Explore cause-and-effect by adjusting parameters
- Analyze quantitative data through graphs
- Discover the surprising connection between mechanics and number theory

---

## 🙏 Acknowledgments

- **3Blue1Brown** (Grant Sanderson) - For the inspiring video that sparked this project
- Built with HTML5 Canvas and vanilla JavaScript

---

> [!quote] Reflection
> *"In the collision of two blocks, we find the digits of π. In the collision of ideas, we find progress."*
