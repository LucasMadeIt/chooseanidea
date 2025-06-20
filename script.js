let ideas = [];
let voteChart;

let TEAM_ID = null;
// Track voted ideas by index (multiple votes allowed)
let votedIdeas = new Set();
// Track which idea is currently being edited (index), or null if none
let editingIdeaIndex = null;

// ----------- TEAM INVITE LOGIC ------------

function generateTeamId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getTeamIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('team');
}

function updateURLWithTeamId(teamId) {
  const newUrl = `${window.location.origin}${window.location.pathname}?team=${teamId}`;
  window.history.replaceState(null, null, newUrl);
}

function loadTeamData() {
  if (!TEAM_ID) return;
  const data = localStorage.getItem(`ideaBoard_${TEAM_ID}`);
  if (data) {
    const parsed = JSON.parse(data);
    ideas = parsed.ideas || [];
    votedIdeas = new Set(parsed.votedIdeas || []);
  } else {
    ideas = [];
    votedIdeas = new Set();
  }
}

function saveTeamData() {
  if (!TEAM_ID) return;
  localStorage.setItem(`ideaBoard_${TEAM_ID}`, JSON.stringify({
    ideas,
    votedIdeas: Array.from(votedIdeas)
  }));
}

function setUIForTeam() {
  const teamSection = document.getElementById('team-section');
  const inputSection = document.getElementById('input-section');
  const votingSection = document.getElementById('voting-section');
  const teamInfo = document.getElementById('team-info');
  const inviteInfo = document.getElementById('team-invite-info');
  const inviteLinkText = document.getElementById('invite-link-text');

  if (TEAM_ID) {
    teamSection.style.display = 'none';
    inputSection.style.display = 'block';
    votingSection.style.display = ideas.length > 0 ? 'block' : 'none';

    teamInfo.textContent = `Team ID: ${TEAM_ID}`;
    const inviteURL = `${window.location.origin}${window.location.pathname}?team=${TEAM_ID}`;
    inviteLinkText.textContent = inviteURL;
    inviteInfo.style.display = 'block';
  } else {
    teamSection.style.display = 'block';
    inputSection.style.display = 'none';
    votingSection.style.display = 'none';
    teamInfo.textContent = '';
    inviteInfo.style.display = 'none';
  }
}

function copyInviteLink() {
  const inviteLinkText = document.getElementById('invite-link-text').textContent;
  navigator.clipboard.writeText(inviteLinkText).then(() => {
    alert('Invite link copied to clipboard!');
  }, () => {
    alert('Failed to copy invite link.');
  });
}

function createTeam() {
  TEAM_ID = generateTeamId();
  updateURLWithTeamId(TEAM_ID);
  ideas = [];
  votedIdeas = new Set();
  saveTeamData();
  setUIForTeam();
  updateVoteSection();
  updateChart();
  alert(`Team created! Your Team ID is ${TEAM_ID}`);
}

function joinTeam() {
  const inviteLinkInput = document.getElementById('team-invite-link');
  const link = inviteLinkInput.value.trim();
  if (!link) {
    alert('Please paste a valid invite link.');
    return;
  }
  try {
    const url = new URL(link);
    const teamParam = url.searchParams.get('team');
    if (!teamParam) {
      alert('Invite link is missing a team parameter.');
      return;
    }
    TEAM_ID = teamParam.toUpperCase();
    updateURLWithTeamId(TEAM_ID);
    loadTeamData();
    setUIForTeam();
    updateVoteSection();
    updateChart();
    alert(`Joined team ${TEAM_ID} successfully!`);
    inviteLinkInput.value = '';
  } catch (e) {
    alert('Invalid invite link format.');
  }
}

// ----------- IDEA + VOTING LOGIC ------------

function addIdea() {
  const titleInput = document.getElementById('idea-title');
  const descInput = document.getElementById('idea-description');
  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!TEAM_ID) {
    alert("Please create or join a team first!");
    return;
  }

  if (!title) {
    alert("Idea title can't be empty.");
    return;
  }

  ideas.push({ title, description, votes: 0 });
  titleInput.value = '';
  descInput.value = '';
  updateVoteSection();
  toggleVotingSection();
  updateChart();
  saveTeamData();
}

function voteForIdea(index) {
  if (!TEAM_ID) {
    alert("Please create or join a team first!");
    return;
  }

  // Prevent voting multiple times on the same idea
  if (votedIdeas.has(index)) {
    alert("You already voted for this idea!");
    return;
  }

  ideas[index].votes++;
  votedIdeas.add(index);
  saveTeamData();
  updateVoteSection();
  updateChart();
}

function startEditIdea(index) {
  if (editingIdeaIndex !== null) {
    alert("Finish editing the current idea first.");
    return;
  }
  editingIdeaIndex = index;
  updateVoteSection();
}

function cancelEditIdea() {
  editingIdeaIndex = null;
  updateVoteSection();
}

function saveEditedIdea(index) {
  const titleInput = document.getElementById(`edit-title-${index}`);
  const descInput = document.getElementById(`edit-desc-${index}`);

  const newTitle = titleInput.value.trim();
  const newDesc = descInput.value.trim();

  if (!newTitle) {
    alert("Idea title can't be empty.");
    return;
  }

  ideas[index].title = newTitle;
  ideas[index].description = newDesc;
  editingIdeaIndex = null;
  saveTeamData();
  updateVoteSection();
  updateChart();
}

function deleteIdea(index) {
  if (!confirm("Are you sure you want to delete this idea?")) {
    return;
  }

  ideas.splice(index, 1);

  // Remove vote record for deleted idea, and adjust votedIdeas set
  if (votedIdeas.has(index)) {
    votedIdeas.delete(index);
  }

  // Shift votes indexes down for ideas after deleted index
  const updatedVoted = new Set();
  votedIdeas.forEach(i => {
    updatedVoted.add(i > index ? i - 1 : i);
  });
  votedIdeas = updatedVoted;

  saveTeamData();
  updateVoteSection();
  toggleVotingSection();
  updateChart();
}

function updateVoteSection() {
  const voteSection = document.getElementById('vote-section');
  voteSection.innerHTML = '';

  ideas.forEach((idea, index) => {
    const ideaDiv = document.createElement('div');
    ideaDiv.className = 'idea';

    if (editingIdeaIndex === index) {
      ideaDiv.innerHTML = `
        <div class="idea-card">
          <input type="text" id="edit-title-${index}" value="${escapeHtml(ideas[index].title)}" />
          <textarea id="edit-desc-${index}" rows="3">${escapeHtml(ideas[index].description)}</textarea>
          <p><strong>Votes:</strong> ${ideas[index].votes}</p>
          <button class="btn btn-edit" onclick="saveEditedIdea(${index})">Save</button>
          <button class="btn btn-cancel" onclick="cancelEditIdea()">Cancel</button>
        </div>
      `;
    } else {
      ideaDiv.innerHTML = `
        <div class="idea-card">
          <h3>${escapeHtml(ideas[index].title)}</h3>
          <p>${escapeHtml(ideas[index].description)}</p>
          <p><strong>Votes:</strong> ${ideas[index].votes}</p>
          <button class="btn" onclick="voteForIdea(${index})" ${votedIdeas.has(index) ? "disabled" : ""}>
            ${votedIdeas.has(index) ? "Voted" : "Vote"}
          </button>
          <button class="btn btn-edit" onclick="startEditIdea(${index})" ${editingIdeaIndex !== null ? "disabled" : ""}>Edit</button>
          <button class="btn btn-delete" onclick="deleteIdea(${index})" ${editingIdeaIndex !== null ? "disabled" : ""}>Delete</button>
        </div>
      `;
    }
    voteSection.appendChild(ideaDiv);
  });
}

function updateChart() {
  const ctx = document.getElementById('vote-chart').getContext('2d');

  // Sort ideas descending by votes for chart
  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes);
  const labels = sortedIdeas.map(i => i.title);
  const data = sortedIdeas.map(i => i.votes);

  if (voteChart) {
    voteChart.destroy();
  }

  voteChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Votes',
        data: data,
        backgroundColor: 'rgba(0, 255, 255, 0.7)', // cyan
        borderColor: '#00ffff',
        borderWidth: 2,
        hoverBackgroundColor: 'rgba(0, 255, 255, 1)',
        hoverBorderColor: '#00ffff',
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 400,
      },
      scales: {
        x: {
          ticks: {
            color: '#00ffff',
            font: {
              size: 14,
              weight: 'bold',
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#00ffff',
            font: {
              size: 14,
              weight: 'bold',
            }
          },
          grid: {
            color: '#004040',
            borderColor: '#00ffff',
            borderWidth: 2,
            drawBorder: true
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#00ffff',
          titleColor: '#000',
          bodyColor: '#000',
          borderColor: '#000',
          borderWidth: 1,
          displayColors: false,
        }
      }
    }
  });
}

function toggleVotingSection() {
  const votingSection = document.getElementById('voting-section');
  votingSection.style.display = ideas.length > 0 ? 'block' : 'none';
}

// Simple escape function to prevent HTML injection in displayed values
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// On page load
window.onload = () => {
  TEAM_ID = getTeamIdFromURL();
  if (TEAM_ID) {
    TEAM_ID = TEAM_ID.toUpperCase();
    loadTeamData();
  }
  setUIForTeam();
  updateVoteSection();
  updateChart();

  // Copy invite link text on click
  document.getElementById('invite-link-text').addEventListener('click', () => {
    copyInviteLink();
  });
};
