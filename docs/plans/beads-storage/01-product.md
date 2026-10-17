# Product: beads-storage

## Problem

An engineer and the agents who work for the engineer cannot share one backlog. Slice state, scores, and attempts live in markdown tables. Work runs on a local machine, in cloud sessions, and with several team members. The program states drift apart, and a merge of the CoBuilder files is hard. A session cannot ask what is next without it reading a table by hand. The engineer also does not want CoBuilder tied to one task system, because Linear and Jira may follow.

## Success metric

A test shows both cases with the file sources removed.

1. A fresh session finds a program and its stage with one `list-programs` call and zero file reads.
2. A session that resumes a build finds the next slice with one `next-ready` call and zero file reads.

The measurement method is one test. It runs against the fake adapter in E1 and against the beads adapter in E2.

## Announcement — the blog post before the feature

CoBuilder now keeps its workflow state in a tracker, and it no longer keeps that state in markdown tables. A new tracker port sits between CoBuilder and the task system. Beads is the first adapter, and Linear and Jira can follow without a change to any skill. A fresh session asks one command for the program and its stage. A session that resumes a build asks for the next slice. Two sessions on one ladder stop racing at the grain of a whole file. Skills and commands call one command, `tracker.py`, and never a tracker directly.

## Screens

no UI
