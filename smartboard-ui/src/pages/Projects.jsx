import { ArrowRight, Clock, Lock, Package, Target } from 'lucide-react';
import ProjectIllustration from '../components/ProjectIllustration.jsx';

/**
 * Projects / Learning Lab.
 * Props: projects, activeProjectId, onStart(projectId)
 */
export default function Projects({ projects = [], activeProjectId, onStart }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Learning Lab</div>
          <h1>Physical electronics projects</h1>
          <p className="lead">
            Build each circuit on your real breadboard. Pinpoint watches every placement and guides you step by step.
          </p>
        </div>
      </header>

      <div className="project-grid">
        {projects.map((p) => {
          const available = p.status === 'available';
          const active = p.id === activeProjectId;
          return (
            <article key={p.id} className={`project-card ${available ? '' : 'is-soon'}`}>
              <div className="project-art">
                <ProjectIllustration kind={p.illustration} />
                {!available && <span className="soon-badge">Coming soon</span>}
                {active && <span className="active-badge">In progress</span>}
              </div>
              <div className="project-body">
                <div className="project-meta">
                  <span className={`diff diff--${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                  <span className="muted">
                    <Clock size={13} /> {p.duration}
                  </span>
                </div>
                <h3>{p.title}</h3>
                <p className="muted">{p.summary}</p>

                <div className="project-section">
                  <h4>
                    <Package size={13} /> Required components
                  </h4>
                  <ul className="tag-list">
                    {p.components.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="project-section">
                  <h4>
                    <Target size={13} /> Learning objectives
                  </h4>
                  <ul className="objectives">
                    {p.objectives.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <footer className="project-foot">
                {available ? (
                  <button className="btn btn-primary" onClick={() => onStart(p.id)}>
                    {active ? 'Continue project' : 'Start project'} <ArrowRight size={15} />
                  </button>
                ) : (
                  <button className="btn btn-ghost" disabled>
                    <Lock size={14} /> Coming soon
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
