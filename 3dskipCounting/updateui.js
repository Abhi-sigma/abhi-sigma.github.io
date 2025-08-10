
 
 
 export function UI(){
  
    function updateSpeed(speed) {
    document.getElementById('speedDisplay').innerText = `${Math.round(speed * 20)} km/h`;
  }

  function updateScore(score) {
   
    document.getElementById('scoreDisplay').innerText = score;
  }

  function updateLifeDisplay(maxWrongHits,wrongHits) {
    const lifeDisplay = document.getElementById('lifeDisplay');
    const hearts = '❤️'.repeat(Math.max(0, maxWrongHits - wrongHits));
    lifeDisplay.innerText = hearts;
  }

  function handleCollisionUI(isCorrect,maxWrongHits,wrongHits) {
    if (!isCorrect) wrongHits++;
    updateLifeDisplay();

    if (wrongHits >= maxWrongHits) {
      document.getElementById('gameOver').style.display = 'block';
      document.getElementById('restartButton').style.display = 'inline-block';
    }
  }

  function restartGame(){
    document.getElementById('restartButton').addEventListener('click', () => location.reload());
  }

  return {updateLifeDisplay,updateScore,handleCollisionUI,restartGame,updateSpeed}
}