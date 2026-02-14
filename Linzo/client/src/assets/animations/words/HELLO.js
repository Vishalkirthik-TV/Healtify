export const HELLO = (ref) => {
    let animations = []
    
    // HELLO sign - wave hand from side to side
    animations.push(["mixamorigRightHand", "rotation", "y", Math.PI/4, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "z", Math.PI/6, "+"]);
    
    ref.animations.push(animations);
    
    animations = []
    
    // Wave motion
    animations.push(["mixamorigRightHand", "rotation", "y", -Math.PI/4, "-"]);
    
    ref.animations.push(animations);
    
    animations = []
    
    // Return to center
    animations.push(["mixamorigRightHand", "rotation", "y", 0, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "z", 0, "-"]);
    
    ref.animations.push(animations);
    
    if(ref.pending === false){
        ref.pending = true;
        ref.animate();
    }
}
