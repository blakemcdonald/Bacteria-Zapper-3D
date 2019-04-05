# Bacteria-Zapper-3D
The long awaited (by none) sequel to Bacteria Zapper!
# Project Requirements
1.	The playing field starts as surface of a sphere centered at the origin. ✔️
2.	The player views the sphere from a mobile vantage point outside the sphere (under interactive control). ✔️
3.	Bacteria grow on the surface of the sphere starting at an arbitrary spot on the surface and growing out uniformly in all directions from that spot at a speed determined by the game. ✔️
4.	The player needs to eradicate the bacteria by placing the mouse over the bacteria and hitting a button. ✔️
5.	The effect of the poison administered is to immediately remove the poisoned bacteria. ✔️
6.	The game can randomly generate up to a fixed number (say 10) different bacteria (each a different color). ✔️
7.	The bacteria appear as a colored circular patch on the surface of the sphere. ✔️
8.	The game gains points through the delays in the user responding and by any specific bacteria reaching a threshold (for example a diameter of a 30 degree arc on a great circle of the sphere). ✔️
9.	The player wins if all bacteria are poisoned before any two different bacteria reach the threshold mentioned above. ✔️
# Optional Features
1.	The effect of the poison administered also propagates outward from the point of insertion of the position until all the bacteria are destroyed.
2.	When two bacteria cultures collide, the first one to appear on the circumference dominates and consumes the later generated bacteria. ✔️
3.	When a bacterial culture is hit, use a simple 2D particle system to simulate an explosion at the point where the poison is administered.
4.	Lighting is used. Use GUI control to enable or disable lighting. ✔️
