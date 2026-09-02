"""A small Browser Use Cloud integration showcase.

The default command is intentionally a dry run so the showcase can be shown
without credentials, a live deployment, or an external browser session.
Pass ``--execute`` only when those resources are available.
"""

from __future__ import annotations

import argparse
import asyncio
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ShowcaseConfig:
    base_url: str
    model: str


def build_agent(config: ShowcaseConfig):
    """Build the Browser Use Cloud agent used by the proposed harness."""

    from browser_use import Agent, Browser, ChatBrowserUse

    browser = Browser(use_cloud=True)
    return Agent(
        task=(
            f"Open {config.base_url} and explore the CTRL+CAT dashboard as a QA user. "
            "Inspect equipment, sites, and the checkout/check-in workflow. "
            "Report the important UI states you encounter."
        ),
        llm=ChatBrowserUse(model=config.model),
        browser=browser,
    )


async def execute(config: ShowcaseConfig) -> None:
    agent = build_agent(config)
    history = await agent.run(max_steps=10)
    print(history.final_result() or history)


def main() -> int:
    parser = argparse.ArgumentParser(description="Showcase the Browser Use Cloud harness")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually invoke Browser Use Cloud (requires credentials and a reachable URL)",
    )
    args = parser.parse_args()

    config = ShowcaseConfig(
        base_url=os.getenv("E2E_BASE_URL", "https://staging.example.com"),
        model=os.getenv("BROWSER_USE_MODEL", "bu-latest"),
    )

    if not args.execute:
        print("[SHOWCASE] Browser Use Cloud agent scaffold is present.")
        print(f"[SHOWCASE] Target: {config.base_url}")
        print(f"[SHOWCASE] Model: {config.model}")
        print("[SHOWCASE] Use --execute only to invoke a live cloud browser.")
        return 0

    if not os.getenv("BROWSER_USE_API_KEY"):
        parser.error("--execute requires BROWSER_USE_API_KEY")

    asyncio.run(execute(config))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
