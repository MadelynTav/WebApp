import React, { Component } from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import { Link } from "react-router";
import AddressBox from "../../components/AddressBox";
import AnalyticsActions from "../../actions/AnalyticsActions";
import BallotActions from "../../actions/BallotActions";
import BallotElectionList from "../../components/Ballot/BallotElectionList";
import BallotTabsRaccoon from "../../components/Navigation/BallotTabsRaccoon";
import BallotItemCompressed from "../../components/Ballot/BallotItemCompressed";
import BallotItemReadyToVote from "../../components/Ballot/BallotItemReadyToVote";
import BallotIntroModal from "../../components/Ballot/BallotIntroModal";
import BallotSideBar from "../../components/Navigation/BallotSideBar";
import BallotStatusMessage from "../../components/Ballot/BallotStatusMessage";
import BallotStore from "../../stores/BallotStore";
import BallotSummaryModal from "../../components/Ballot/BallotSummaryModal";
import BrowserPushMessage from "../../components/Widgets/BrowserPushMessage";
import CandidateActions from "../../actions/CandidateActions";
import CandidateModal from "../../components/Ballot/CandidateModal";
import cookies from "../../utils/cookies";
import { cordovaDot, historyPush, isCordova, isWebApp } from "../../utils/cordovaUtils";
import ElectionActions from "../../actions/ElectionActions";
import ElectionStore from "../../stores/ElectionStore";
import Helmet from "react-helmet";
import isMobile from "../../utils/isMobile";
import IssueActions from "../../actions/IssueActions";
import IssueStore from "../../stores/IssueStore";
import { renderLog } from "../../utils/logging";
import OpenExternalWebSite from "../../utils/OpenExternalWebSite";
import MeasureActions from "../../actions/MeasureActions";
import MeasureModal from "../../components/Ballot/MeasureModal";
import moment from "moment";
import OrganizationActions from "../../actions/OrganizationActions";
import SelectBallotModal from "../../components/Ballot/SelectBallotModal";
import SupportActions from "../../actions/SupportActions";
import SupportStore from "../../stores/SupportStore";
import VoterActions from "../../actions/VoterActions";
import VoterConstants from "../../constants/VoterConstants";
import VoterGuideActions from "../../actions/VoterGuideActions";
import VoterGuideStore from "../../stores/VoterGuideStore";
import VoterStore from "../../stores/VoterStore";
import webAppConfig from "../../config";

// Related to WebApp/src/js/components/VoterGuide/VoterGuideBallot.jsx
export default class Ballot extends Component {
  static propTypes = {
    location: PropTypes.object,
    params: PropTypes.object,
  };

  constructor (props) {
    super(props);
    this.state = {
      ballotElectionList: [],
      ballotWithAllItems: [],
      ballotWithAllItemsByFilterType: [],
      ballot_item_filter_type: "",
      ballot_returned_we_vote_id: "",
      ballot_location_shortcut: "",
      candidate_for_modal: {
        voter_guides_to_follow_for_latest_ballot_item: [],
        position_list: [],
      },
      hide_intro_modal_from_url: 0,
      hide_intro_modal_from_cookie: 0,
      lastHashUsedInLinkScroll: "",
      measure_for_modal: {
        voter_guides_to_follow_for_latest_ballot_item: [],
        position_list: [],
      },
      mounted: false,
      showBallotIntroModal: false,
      showCandidateModal: false,
      showMeasureModal: false,
      showSelectBallotModal: false,
      showBallotSummaryModal: false,
      voter_ballot_list: [],
      waiting_for_new_ballot_items: false,
      ballot_item_unfurled_tracker: {},
    };

    this.ballotItems = {};
    this.ballotItemLinkHasBeenClicked = this.ballotItemLinkHasBeenClicked.bind(this);
    this.toggleBallotIntroModal = this.toggleBallotIntroModal.bind(this);
    this.toggleCandidateModal = this.toggleCandidateModal.bind(this);
    this.toggleMeasureModal = this.toggleMeasureModal.bind(this);
    this.toggleSelectBallotModal = this.toggleSelectBallotModal.bind(this);
    this.toggleBallotSummaryModal = this.toggleBallotSummaryModal.bind(this);
    this.updateOfficeDisplayUnfurledTracker = this.updateOfficeDisplayUnfurledTracker.bind(this);
  }

  componentDidMount () {
    // console.log("Ballot componentDidMount");
    let hide_intro_modal_from_url = this.props.location.query ? this.props.location.query.hide_intro_modal : 0;
    let hide_intro_modal_from_cookie = cookies.getItem("hide_intro_modal") || 0;
    let wait_until_voter_sign_in_completes = this.props.location.query ? this.props.location.query.wait_until_voter_sign_in_completes : 0;
    let issues_voter_can_follow = IssueStore.getIssuesVoterCanFollow(); // Check to see if the issues have been retrieved yet
    let issues_voter_can_follow_exist = issues_voter_can_follow && issues_voter_can_follow.length;
    // console.log("Ballot componentDidMount issues_voter_can_follow_exist: ", issues_voter_can_follow_exist);

    if (wait_until_voter_sign_in_completes !== undefined || hide_intro_modal_from_cookie || hide_intro_modal_from_url || !issues_voter_can_follow_exist) {
      this.setState({
        mounted: true,
        showBallotIntroModal: false,
      });
    } else {
      // hide_intro_modal is the default now
      // showBallotIntroModal: !VoterStore.getInterfaceFlagState(VoterConstants.BALLOT_INTRO_MODAL_SHOWN),
      this.setState({
        mounted: true,
        showBallotIntroModal: false,
      });
    }

    let filter_type = this.props.location && this.props.location.query ? this.props.location.query.type : "all";
    let ballotWithAllItemsByFilterType = BallotStore.getBallotByFilterType(filter_type);
    if (ballotWithAllItemsByFilterType !== undefined) {
      // console.log("ballotWithAllItemsByFilterType !== undefined");
      if (filter_type === "all") {
        this.setState({
          ballotWithAllItems: ballotWithAllItemsByFilterType,
          ballotWithAllItemsByFilterType: ballotWithAllItemsByFilterType,
          filter_type: filter_type,
        });
      } else {
        let ballotWithAllItems = BallotStore.getBallotByFilterType("all");
        this.setState({
          ballotWithAllItems: ballotWithAllItems,
          ballotWithAllItemsByFilterType: ballotWithAllItemsByFilterType,
          filter_type: filter_type,
        });
      }
    }

    let google_civic_election_id_from_url = this.props.params.google_civic_election_id || 0;

    // console.log("google_civic_election_id_from_url: ", google_civic_election_id_from_url);
    let ballot_returned_we_vote_id = this.props.params.ballot_returned_we_vote_id || "";
    ballot_returned_we_vote_id = ballot_returned_we_vote_id === "none" ? "" : ballot_returned_we_vote_id;

    // console.log("this.props.params.ballot_returned_we_vote_id: ", this.props.params.ballot_returned_we_vote_id);
    let ballot_location_shortcut = this.props.params.ballot_location_shortcut || "";
    ballot_location_shortcut = ballot_location_shortcut.trim();
    ballot_location_shortcut = ballot_location_shortcut === "none" ? "" : ballot_location_shortcut;
    let google_civic_election_id = 0;

    // console.log("componentDidMount, BallotStore.ballot_properties: ", BallotStore.ballot_properties);
    if (google_civic_election_id_from_url !== 0) {
      google_civic_election_id_from_url = parseInt(google_civic_election_id_from_url, 10);

      // google_civic_election_id = google_civic_election_id_from_url;
    } else if (BallotStore.ballot_properties && BallotStore.ballot_properties.google_civic_election_id) {
      google_civic_election_id = BallotStore.ballot_properties.google_civic_election_id;
    }

    // console.log("ballot_returned_we_vote_id: ", ballot_returned_we_vote_id, ", ballot_location_shortcut:", ballot_location_shortcut, ", google_civic_election_id_from_url: ", google_civic_election_id_from_url);
    if (ballot_returned_we_vote_id || ballot_location_shortcut || google_civic_election_id_from_url) {
      if (ballot_location_shortcut !== "") {

        // Change the ballot on load to make sure we are getting what we expect from the url
        BallotActions.voterBallotItemsRetrieve(0, "", ballot_location_shortcut);

        // Change the URL to match
        historyPush("/ballot/" + ballot_location_shortcut);
      } else if (ballot_returned_we_vote_id !== "") {

        // Change the ballot on load to make sure we are getting what we expect from the url
        BallotActions.voterBallotItemsRetrieve(0, ballot_returned_we_vote_id, "");

        // Change the URL to match
        historyPush("/ballot/id/" + ballot_returned_we_vote_id);
      } else if (google_civic_election_id_from_url !== 0) {

        // Change the ballot on load to make sure we are getting what we expect from the url
        if (google_civic_election_id !== google_civic_election_id_from_url) {
          BallotActions.voterBallotItemsRetrieve(google_civic_election_id_from_url, "", "");

          // Change the URL to match
          historyPush("/ballot/election/" + google_civic_election_id_from_url);
        }

        // No change to the URL needed
        // Now set google_civic_election_id
        google_civic_election_id = google_civic_election_id_from_url;
      } else if (google_civic_election_id !== 0) {
        // No need to retrieve data again
        // Change the URL to match the current google_civic_election_id
        historyPush("/ballot/election/" + google_civic_election_id);
      }
    } else if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found === false){ // No ballot found
      // console.log("if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found === false");
      historyPush("/settings/location");
    } else if (ballotWithAllItemsByFilterType === undefined) {

      // console.log("WebApp doesn't know the election or have ballot data, so ask the API server to return best guess");
      BallotActions.voterBallotItemsRetrieve(0, "", "");
    }

    // console.log("Ballot, google_civic_election_id: ", google_civic_election_id, ", ballot_location_shortcut: ", ballot_location_shortcut, "ballot_returned_we_vote_id: ", ballot_returned_we_vote_id);
    // console.log("VoterStore.election_id: ", VoterStore.election_id());
    if (google_civic_election_id || ballot_location_shortcut || ballot_returned_we_vote_id) {
      // console.log("CALLING IssueActions.issuesRetrieveForElection");

      if (IssueStore.getPreviousGoogleCivicElectionId() < 1) {
        IssueActions.issuesRetrieveForElection(google_civic_election_id, ballot_location_shortcut, ballot_returned_we_vote_id);
      }

      this.setState({
        issues_retrieved_from_google_civic_election_id: google_civic_election_id,
        issues_retrieved_from_ballot_returned_we_vote_id: ballot_returned_we_vote_id,
        issues_retrieved_from_ballot_location_shortcut: ballot_location_shortcut,
      });
    }
    // We need a ballotStoreListener here because we want the ballot to display before positions are received
    this.ballotStoreListener = BallotStore.addListener(this.onBallotStoreChange.bind(this));
    // NOTE: voterAllPositionsRetrieve and positionsCountForAllBallotItems are also called in SupportStore when voterAddressRetrieve is received,
    // so we get duplicate calls when you come straight to the Ballot page. There is no easy way around this currently.
    SupportActions.voterAllPositionsRetrieve();

    // June 2018: Avoid hitting this same api multiple times, if we already have the data
    if (!SupportStore.isSupportAlreadyInCache()) {
      SupportActions.positionsCountForAllBallotItems(google_civic_election_id);
    }

    BallotActions.voterBallotListRetrieve(); // Retrieve a list of ballots for the voter from other elections
    this.voterGuideStoreListener = VoterGuideStore.addListener(this.onVoterGuideStoreChange.bind(this));
    this.supportStoreListener = SupportStore.addListener(this.onBallotStoreChange.bind(this));
    this.onVoterStoreChange();
    this.voterStoreListener = VoterStore.addListener(this.onVoterStoreChange.bind(this));

    // Once a voter hits the ballot, they have gone through orientation
    cookies.setItem("show_full_navigation", "1", Infinity, "/");

    this.electionListListener = ElectionStore.addListener(this.onElectionStoreChange.bind(this));
    ElectionActions.electionsRetrieve();
    OrganizationActions.organizationsFollowedRetrieve();
    VoterActions.voterRetrieve();  // This is needed to update the interface status settings

    if (google_civic_election_id && google_civic_election_id !== 0) {
      AnalyticsActions.saveActionBallotVisit(google_civic_election_id);
    } else {
      AnalyticsActions.saveActionBallotVisit(VoterStore.election_id());
    }

    this.setState({
      ballotElectionList: BallotStore.ballotElectionList(),
      ballot_item_filter_type: "Federal",
      ballot_returned_we_vote_id: ballot_returned_we_vote_id,
      ballot_location_shortcut: ballot_location_shortcut,
      google_civic_election_id: parseInt(google_civic_election_id, 10),
      hide_intro_modal_from_url: hide_intro_modal_from_url,
      hide_intro_modal_from_cookie: hide_intro_modal_from_cookie,
      location: this.props.location,
      pathname: this.props.location.pathname,
      wait_until_voter_sign_in_completes: wait_until_voter_sign_in_completes,
    });

    if (this.props.location && this.props.location.hash) {
      // this.hashLinkScroll();
      this.setState({ lastHashUsedInLinkScroll: this.props.location.hash });
    }
  }

  componentWillReceiveProps (nextProps) {
    // console.log('Ballot componentWillReceiveProps()');
    // console.log("Ballot componentWillReceiveProps, nextProps: ", nextProps);
    // console.log("Ballot this.state: ", this.state);
    let filter_type = nextProps.location && nextProps.location.query ? nextProps.location.query.type : "all";

    // We don't want to let the google_civic_election_id disappear
    let google_civic_election_id = nextProps.params.google_civic_election_id || this.state.google_civic_election_id;
    let ballot_returned_we_vote_id = nextProps.params.ballot_returned_we_vote_id || "";
    ballot_returned_we_vote_id = ballot_returned_we_vote_id.trim();
    let ballot_location_shortcut = nextProps.params.ballot_location_shortcut || "";
    ballot_location_shortcut = ballot_location_shortcut.trim();

    // Were there any actual changes?
    if (ballot_returned_we_vote_id !== this.state.ballot_returned_we_vote_id || ballot_location_shortcut !== this.state.ballot_location_shortcut || google_civic_election_id !== this.state.google_civic_election_id || filter_type !== this.state.filter_type) {
      this.setState({
        ballotWithAllItems: BallotStore.getBallotByFilterType("all"),
        ballotWithAllItemsByFilterType: BallotStore.getBallotByFilterType(filter_type),
        ballot_returned_we_vote_id: ballot_returned_we_vote_id,
        ballot_location_shortcut: ballot_location_shortcut,
        filter_type: filter_type,
        google_civic_election_id: parseInt(google_civic_election_id, 10),
        location: nextProps.location,
        pathname: nextProps.location.pathname,
      });

      if (google_civic_election_id && google_civic_election_id !== 0) {
        AnalyticsActions.saveActionBallotVisit(google_civic_election_id);
      } else {
        AnalyticsActions.saveActionBallotVisit(VoterStore.election_id());
      }
    }

    if (nextProps.location && nextProps.location.hash) {
      // this.hashLinkScroll();
      this.setState({ lastHashUsedInLinkScroll: nextProps.location.hash });
    }
  }

  componentDidUpdate (prevProps, prevState) {
    // console.log('Ballot componentDidUpdate()', 'prevState.lastHashUsedInLinkScroll:', prevState.lastHashUsedInLinkScroll,'this.state.lastHashUsedInLinkScroll:', this.state.lastHashUsedInLinkScroll);
    if (this.state.lastHashUsedInLinkScroll && this.state.lastHashUsedInLinkScroll !== prevState.lastHashUsedInLinkScroll) {
      this.hashLinkScroll();
      // this.setState({lastHashUsedInLinkScroll: this.state.location.hash});
    }
  }

  componentWillUnmount () {
    // console.log("Ballot componentWillUnmount");

    //this.setState({mounted: false});
    if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found === false) {
      // No ballot found
    }

    this.ballotStoreListener.remove();
    this.electionListListener.remove();
    this.supportStoreListener.remove();
    this.voterGuideStoreListener.remove();
    this.voterStoreListener.remove();
  }

  toggleCandidateModal (candidate_for_modal) {
    if (candidate_for_modal) {
      // Slows down the browser too much when run for all candidates
      // VoterGuideActions.voterGuidesToFollowRetrieveByBallotItem(candidate_for_modal.we_vote_id, "CANDIDATE");
      candidate_for_modal.voter_guides_to_follow_for_latest_ballot_item = VoterGuideStore.getVoterGuidesToFollowForBallotItemId(candidate_for_modal.we_vote_id);
      CandidateActions.positionListForBallotItem(candidate_for_modal.we_vote_id);
    }

    this.setState({
      candidate_for_modal: candidate_for_modal,
      showCandidateModal: !this.state.showCandidateModal,
    });
  }

  toggleBallotIntroModal () {
    if (this.state.showBallotIntroModal) {
      // Saved to the voter record that the ballot introduction has been seen
      VoterActions.voterUpdateInterfaceStatusFlags(VoterConstants.BALLOT_INTRO_MODAL_SHOWN);
    } else if (this.state.location.hash.includes("#")) {
      // Clear out any # from anchors in the URL
      historyPush(this.state.pathname);
    }

    this.setState({ showBallotIntroModal: !this.state.showBallotIntroModal });
  }

  toggleMeasureModal (measure_for_modal) {
    // console.log("toggleMeasureModal, measure_for_modal: ", measure_for_modal);
    if (measure_for_modal) {
      VoterGuideActions.voterGuidesToFollowRetrieveByBallotItem(measure_for_modal.we_vote_id, "MEASURE");
      measure_for_modal.voter_guides_to_follow_for_latest_ballot_item = VoterGuideStore.getVoterGuidesToFollowForBallotItemId(measure_for_modal.we_vote_id);
      MeasureActions.positionListForBallotItem(measure_for_modal.we_vote_id);
    }

    this.setState({
      measure_for_modal: measure_for_modal,
      showMeasureModal: !this.state.showMeasureModal,
    });
  }

  toggleSelectBallotModal (destinationUrlForHistoryPush = "") {
    // console.log("Ballot toggleSelectBallotModal destinationUrlForHistoryPush: ", destinationUrlForHistoryPush, ", this.state.pathname : ", this.state.pathname);
    if (this.state.showSelectBallotModal) {
      if (destinationUrlForHistoryPush && destinationUrlForHistoryPush !== "") {
        historyPush(destinationUrlForHistoryPush);
      }
    } else {
      BallotActions.voterBallotListRetrieve(); // Retrieve a list of ballots for the voter from other elections
    }

    this.setState({
      showSelectBallotModal: !this.state.showSelectBallotModal,
    });
  }

  toggleBallotSummaryModal () {
    this.setState({
      showBallotSummaryModal: !this.state.showBallotSummaryModal,
    });
  }

  onVoterStoreChange () {
    // console.log("Ballot.jsx onVoterStoreChange");
    if (this.state.mounted) {
      let consider_opening_ballot_intro_modal = true;
      if (this.state.wait_until_voter_sign_in_completes) {
        consider_opening_ballot_intro_modal = false;
        if (this.state.voter && this.state.voter.is_signed_in) {
          consider_opening_ballot_intro_modal = true;
          this.setState({ wait_until_voter_sign_in_completes: undefined });
          // console.log("onVoterStoreChange, about tohistoryPush(this.state.pathname):", this.state.pathname);
          historyPush(this.state.pathname);
        }
      }

      let issues_voter_can_follow = IssueStore.getIssuesVoterCanFollow(); // Check to see if the issues have been retrieved yet
      let issues_voter_can_follow_exist = issues_voter_can_follow && issues_voter_can_follow.length;
      // console.log("Ballot onVoterStoreChange issues_voter_can_follow_exist: ", issues_voter_can_follow_exist);

      if (this.state.hide_intro_modal_from_cookie || this.state.hide_intro_modal_from_url || !issues_voter_can_follow_exist) {
        consider_opening_ballot_intro_modal = false;
      }

      // console.log("Ballot.jsx onVoterStoreChange VoterStore.getVoter: ", VoterStore.getVoter());
      if (consider_opening_ballot_intro_modal) {
        // hide_intro_modal is the default now
        // showBallotIntroModal: !VoterStore.getInterfaceFlagState(VoterConstants.BALLOT_INTRO_MODAL_SHOWN),
        this.setState({
          voter: VoterStore.getVoter(),
          showBallotIntroModal: false,
          google_civic_election_id: parseInt(VoterStore.election_id(), 10),
        });
      } else {
        this.setState({
          voter: VoterStore.getVoter(),
          google_civic_election_id: parseInt(VoterStore.election_id(), 10),
        });
      }
    }
  }

  onBallotStoreChange () {
    // console.log("Ballot.jsx onBallotStoreChange, BallotStore.ballot_properties: ", BallotStore.ballot_properties);
    if (this.state.mounted) {
      if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_found && BallotStore.ballot && BallotStore.ballot.length === 0) {
        // Ballot is found but ballot is empty. We want to stay put.
        // console.log("onBallotStoreChange: ballotWithAllItemsByFilterType is empty");
      } else {
        let prior_filter_type = this.state.filter_type || "all";
        let new_filter_type = this.state.location && this.state.location.query && this.state.location.query.type !== "" ? this.state.location.query.type : prior_filter_type;
        this.setState({
          ballotWithAllItems: BallotStore.getBallotByFilterType("all"),
          ballotWithAllItemsByFilterType: BallotStore.getBallotByFilterType(new_filter_type),
          filter_type: new_filter_type,
        });
      }
    }

    if (BallotStore.ballot_properties) {
      // If the incoming google_civic_election_id, ballot_returned_we_vote_id, or ballot_location_shortcut are different, call issuesRetrieveForElection
      if (parseInt(BallotStore.ballot_properties.google_civic_election_id, 10) !== this.state.issues_retrieved_from_google_civic_election_id ||
          BallotStore.ballot_properties.ballot_returned_we_vote_id !== this.state.issues_retrieved_from_ballot_returned_we_vote_id ||
          BallotStore.ballot_properties.ballot_location_shortcut !== this.state.issues_retrieved_from_ballot_location_shortcut) {
        // console.log("onBallotStoreChange, Calling issuesRetrieveForElection");

        if (IssueStore.getPreviousGoogleCivicElectionId() < 1) {
          IssueActions.issuesRetrieveForElection(BallotStore.ballot_properties.google_civic_election_id, BallotStore.ballot_properties.ballot_location_shortcut, BallotStore.ballot_properties.ballot_returned_we_vote_id);
        }

        this.setState({
          issues_retrieved_from_google_civic_election_id: parseInt(BallotStore.ballot_properties.google_civic_election_id, 10),
          issues_retrieved_from_ballot_returned_we_vote_id: BallotStore.ballot_properties.ballot_returned_we_vote_id,
          issues_retrieved_from_ballot_location_shortcut: BallotStore.ballot_properties.ballot_location_shortcut,
        });
      }

      this.setState({
        ballot_returned_we_vote_id: BallotStore.ballot_properties.ballot_returned_we_vote_id || "",
        ballot_location_shortcut: BallotStore.ballot_properties.ballot_location_shortcut || "",
        google_civic_election_id: parseInt(BallotStore.ballot_properties.google_civic_election_id, 10),
      });

    }

    this.setState({ ballotElectionList: BallotStore.ballotElectionList() });

    if (Object.keys(this.state.ballot_item_unfurled_tracker).length === 0) {
      // console.log("current tracker in Ballotstore", BallotStore.current_ballot_item_unfurled_tracker)
      this.setState({
        ballot_item_unfurled_tracker: BallotStore.current_ballot_item_unfurled_tracker,
      });
    }
  }

  onElectionStoreChange () {
    // console.log("Elections, onElectionStoreChange");
    let elections_list = ElectionStore.getElectionList();
    let elections_locations_list = [];
    let voter_ballot; // A different format for much of the same data
    let voter_ballot_list = [];
    let one_ballot_location;
    let ballot_location_shortcut;
    let ballot_returned_we_vote_id;

    for (let i = 0; i < elections_list.length; i++) {
      let election = elections_list[i];
      elections_locations_list.push(election);
      ballot_returned_we_vote_id = "";
      ballot_location_shortcut = "";
      if (election.ballot_location_list && election.ballot_location_list.length) {
        // We want to add the shortcut and we_vote_id for the first ballot location option
        one_ballot_location = election.ballot_location_list[0];
        ballot_location_shortcut = one_ballot_location.ballot_location_shortcut || "";
        ballot_location_shortcut = ballot_location_shortcut.trim();
        ballot_returned_we_vote_id = one_ballot_location.ballot_returned_we_vote_id || "";
        ballot_returned_we_vote_id = ballot_returned_we_vote_id.trim();
      }

      voter_ballot = {
        google_civic_election_id: election.google_civic_election_id,
        election_description_text: election.election_name,
        election_day_text: election.election_day_text,
        original_text_for_map_search: "",
        ballot_location_shortcut: ballot_location_shortcut,
        ballot_returned_we_vote_id: ballot_returned_we_vote_id,
      };
      voter_ballot_list.push(voter_ballot);
    }

    this.setState({
      elections_locations_list: elections_locations_list,
      voter_ballot_list: voter_ballot_list,
    });
  }

  onVoterGuideStoreChange () {
    // console.log("Ballot onVoterGuideStoreChange");
    // Update the data for the modal to include the position of the organization related to this ballot item
    if (this.state.candidate_for_modal) {
      this.setState({
        candidate_for_modal: {
          ...this.state.candidate_for_modal,
          voter_guides_to_follow_for_latest_ballot_item: VoterGuideStore.getVoterGuidesToFollowForLatestBallotItem(),
        },
      });
    } else if (this.state.measure_for_modal) {
      this.setState({
        measure_for_modal: {
          ...this.state.measure_for_modal,
          voter_guides_to_follow_for_latest_ballot_item: VoterGuideStore.getVoterGuidesToFollowForLatestBallotItem(),
        },
      });
    }
  }

  // Needed to scroll to anchor tags based on hash in url (as done for bookmarks)
  hashLinkScroll () {
    const { hash } = window.location;
    if (hash !== "") {
      // Push onto callback queue so it runs after the DOM is updated,
      // this is required when navigating from a different page so that
      // the element is rendered on the page before trying to getElementById.
      setTimeout(() => {
        let id = hash.replace("#", "");
        const element = document.getElementById(id);

        if (element) {
          let positionY = element.offsetTop;
          if (isMobile()) {
            window.scrollTo(0, positionY + 250);
          } else {
            window.scrollTo(0, positionY + 196);
          }
        }
      }, 0);
    }
  }

  toggleExpandBallotItemDetails (selectedBallotItemId) {
    if (this.ballotItems[selectedBallotItemId] &&
        this.ballotItems[selectedBallotItemId].ballotItem &&
        this.ballotItems[selectedBallotItemId].ballotItem.toggleExpandDetails) {
      this.ballotItems[selectedBallotItemId].ballotItem.toggleExpandDetails(true);
    }
  }

  ballotItemLinkHasBeenClicked (selectedBallotItemId) {
    let ballot_item = this.state.ballotWithAllItemsByFilterType.find(item => item.we_vote_id === selectedBallotItemId);
    if (ballot_item && ballot_item.kind_of_ballot_item === "MEASURE") {
      this.setState({
        ballot_item_filter_type: "Measure",
      }, () => this.toggleExpandBallotItemDetails(selectedBallotItemId));
    } else {
      this.setState({
        ballot_item_filter_type: ballot_item.race_office_level,
      }, () => this.toggleExpandBallotItemDetails(selectedBallotItemId));
    }
  }

  getEmptyMessageByFilterType (filter_type) {
    switch (filter_type) {
      case "filterRemaining":
        return "You have chosen a candidate for every office and decided on all measures.";
      case "filterDecided":
        return "You haven't supported any candidates or decided on any measures yet.";
      default:
        return "";
    }
  }

  updateOfficeDisplayUnfurledTracker (we_vote_id, status) {
    const new_ballot_item_unfurled_tracker = { ... this.state.ballot_item_unfurled_tracker, [we_vote_id]: status };
    BallotActions.voterBallotItemOpenOrClosedSave(new_ballot_item_unfurled_tracker);
    this.setState({
      ballot_item_unfurled_tracker: new_ballot_item_unfurled_tracker,
    });
  }

  setBallotItemFilterType (type) {
    if (type === this.state.ballot_item_filter_type) {
      this.setState({
        ballot_item_filter_type: "All",
      });
    } else {
      this.setState({
        ballot_item_filter_type: type,
      });
    }
  }

  render () {
    renderLog(__filename);
    // console.log("Ballot render");

    const BALLOT_ITEM_FILTER_TYPES = ["Federal", "State", "Measure", "Local"];
    let text_for_map_search = VoterStore.getTextForMapSearch();
    let issues_voter_can_follow = IssueStore.getIssuesVoterCanFollow(); // Don't auto-open intro until Issues are loaded
    let issues_voter_can_follow_exist = issues_voter_can_follow && issues_voter_can_follow.length;
    // console.log("Ballot render issues_voter_can_follow_exist: ", issues_voter_can_follow_exist);

    if (!this.state.ballotWithAllItemsByFilterType) {
      return <div className="ballot container-fluid well u-stack--md u-inset--md">
        { this.state.showBallotIntroModal && issues_voter_can_follow_exist ?
          <BallotIntroModal show={this.state.showBallotIntroModal} toggleFunction={this.toggleBallotIntroModal} /> : null }
        <div className={ isWebApp() ? "ballot__header" : "ballot__header ballot__header__top-cordova"} >
          <BrowserPushMessage incomingProps={this.props} />
          <p className="ballot__date_location">
            If your ballot does not appear momentarily, please <Link to="/settings/location">change your address</Link>.
          </p>
        </div>
        <BallotElectionList ballotElectionList={this.state.voter_ballot_list}
                            ballotBaseUrl="/ballot"
                            showRelevantElections />
      </div>;
    }

    const missing_address = this.state.location === null;

    // const ballot_caveat = BallotStore.ballot_properties.ballot_caveat; // ballot_properties might be undefined
    const electionName = BallotStore.currentBallotElectionName;
    const electionDayText = BallotStore.currentBallotElectionDate;
    const polling_location_we_vote_id_source = BallotStore.currentBallotPollingLocationSource;
    let ballot_returned_admin_edit_url = webAppConfig.WE_VOTE_SERVER_ROOT_URL + "b/" + polling_location_we_vote_id_source + "/list_edit_by_polling_location/?google_civic_election_id=" + VoterStore.election_id() + "&state_code=";

    const emptyBallotButton = this.state.filter_type !== "none" && !missing_address ?
        <span>
          {/* <Link to="/ballot">
              <Button bsStyle="primary">View Full Ballot</Button>
          </Link> */}
        </span> :
        <div className="container-fluid well u-stack--md u-inset--md">
          <Helmet title="Enter Your Address - We Vote" />
          <h3 className="h3">
            Enter address where you are registered to vote
          </h3>
          <div>
            <AddressBox {...this.props} saveUrl="/ballot" />
          </div>
        </div>;

    // console.log("ballotWithAllItemsByFilterType: ", this.state.ballotWithAllItemsByFilterType);
    const emptyBallot = this.state.ballotWithAllItemsByFilterType.length === 0 ?
      <div>
        <h3 className="text-center">{this.getEmptyMessageByFilterType(this.state.filter_type)}</h3>
        {emptyBallotButton}
        <div className="container-fluid well u-stack--md u-inset--md">
          <BallotElectionList ballotElectionList={this.state.voter_ballot_list} ballotBaseUrl="/ballot" />
        </div>
     </div> :
      null;

    const electionDayTextFormatted = electionDayText ? <span>{moment(electionDayText).format("MMM Do, YYYY")}</span> : <span />;

    let in_remaining_decisions_mode = this.state.filter_type === "filterRemaining";
    let in_ready_to_vote_mode = this.state.filter_type === "filterReadyToVote";

    let voter_ballot_location = VoterStore.getBallotLocationForVoter();
    let voter_entered_address = false;
    let voter_specific_ballot_from_google_civic = false;
    let ballot_location_display_name = "";
    let substituted_address_nearby = "";
    if (voter_ballot_location && voter_ballot_location.voter_entered_address) {
      voter_entered_address = true;
    }

    if (voter_ballot_location && voter_ballot_location.voter_specific_ballot_from_google_civic) {
      voter_specific_ballot_from_google_civic = true;
    }

    if (BallotStore.ballot_properties && BallotStore.ballot_properties.ballot_location_display_name) {
      // console.log("BallotStore.ballot_properties:", BallotStore.ballot_properties);
      ballot_location_display_name = BallotStore.ballot_properties.ballot_location_display_name;
    } else if (voter_ballot_location && voter_ballot_location.ballot_location_display_name) {
      // Get the location name from the VoterStore address object
      // console.log("voter_ballot_location:", voter_ballot_location);
      ballot_location_display_name = voter_ballot_location.ballot_location_display_name;
    }

    if (BallotStore.ballot_properties && BallotStore.ballot_properties.substituted_address_nearby) {
      if (BallotStore.ballot_properties.substituted_address_city && BallotStore.ballot_properties.substituted_address_state && BallotStore.ballot_properties.substituted_address_zip) {
        substituted_address_nearby = BallotStore.ballot_properties.substituted_address_city + ", ";
        substituted_address_nearby += BallotStore.ballot_properties.substituted_address_state + " ";
        substituted_address_nearby += BallotStore.ballot_properties.substituted_address_zip;
      } else {
        substituted_address_nearby = BallotStore.ballot_properties.substituted_address_nearby;
      }
    } else if (voter_ballot_location && voter_ballot_location.text_for_map_search) {
      // Get the location from the VoterStore address object
      substituted_address_nearby = voter_ballot_location.text_for_map_search;
    }

    if (this.state.ballotWithAllItemsByFilterType.length === 0 && in_remaining_decisions_mode) {
      historyPush(this.state.pathname);
    }

    // console.log("Ballot.jsx, this.state.google_civic_election_id: ", this.state.google_civic_election_id);

    return <div className="ballot">
      { this.state.showBallotIntroModal ? <BallotIntroModal show={this.state.showBallotIntroModal} toggleFunction={this.toggleBallotIntroModal} /> : null }
      { this.state.showMeasureModal ? <MeasureModal show={this.state.showMeasureModal} toggleFunction={this.toggleMeasureModal} measure={this.state.measure_for_modal}/> : null }
      { this.state.showCandidateModal ? <CandidateModal show={this.state.showCandidateModal} toggleFunction={this.toggleCandidateModal} candidate={this.state.candidate_for_modal}/> : null }
      { this.state.showSelectBallotModal ? <SelectBallotModal show={this.state.showSelectBallotModal} toggleFunction={this.toggleSelectBallotModal} ballotElectionList={this.state.ballotElectionList} pathname={this.state.pathname} ballotBaseUrl="/ballot" google_civic_election_id={this.state.google_civic_election_id} location={this.state.location} /> : null }
      { this.state.showBallotSummaryModal ? <BallotSummaryModal show={this.state.showBallotSummaryModal} toggleFunction={this.toggleBallotSummaryModal} /> : null }

      <div className={ isWebApp() ? "ballot__heading" : "ballot__heading ballot__heading-cordova" } >
        <div className="page-content-container">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <Helmet title="Ballot - We Vote" />
                <BrowserPushMessage incomingProps={this.props} />
                <header className="ballot__header__group">
                  <h1 className="h1 ballot__header__title">
                    { electionName ?
                       <span className="u-push--sm">
                         {electionName} <span className="hidden-xs">&mdash; </span>
                         <span className="u-gray-mid u-no-break">{electionDayTextFormatted}</span>
                       </span> :
                       <span className="u-push--sm">
                         Loading Election...
                       </span> }
                    {/* We always show the change election option */}
                    <span className="u-no-break hidden-print u-cursor--pointer"
                          onClick={this.toggleSelectBallotModal} >
                      <span className="u-no-break u-f8 hidden-xs"><img src={cordovaDot("/img/global/icons/gear-icon.png")}
                           role="button"
                           alt={"change address or election"}/> change address or election</span>
                      <span className="u-no-break u-f6 visible-xs"><img src={cordovaDot("/img/global/icons/gear-icon.png")}
                           role="button"
                           alt={"change address or election"}/> change address or election</span>
                    </span>
                  </h1>
                </header>

                {this.state.ballotWithAllItemsByFilterType.length > 0 ?
                  <div>
                    <BallotStatusMessage ballot_location_chosen
                                         ballot_location_display_name={ballot_location_display_name}
                                         election_day_text={ElectionStore.getElectionDayText(this.state.google_civic_election_id)}
                                         election_is_upcoming={ElectionStore.isElectionUpcoming(this.state.google_civic_election_id)}
                                         voter_entered_address={voter_entered_address}
                                         google_civic_data_exists={ElectionStore.googleCivicDataExists(this.state.google_civic_election_id)}
                                         voter_specific_ballot_from_google_civic={voter_specific_ballot_from_google_civic}
                                         substituted_address_nearby={substituted_address_nearby}
                                         toggleSelectBallotModal={this.toggleSelectBallotModal}
                                         google_civic_election_id={this.state.google_civic_election_id}
                    />
                  </div> :
                  null }

                { text_for_map_search || this.state.ballotWithAllItemsByFilterType.length > 0 ?
                  <div className="ballot__filter__container">
                    <div className="ballot__filter hidden-print">
                      <BallotTabsRaccoon pathname={this.state.pathname}
                                         ballot_type={BallotStore.getBallotTypeByFilterType(this.state.filter_type)}
                                         election_day_text={ElectionStore.getElectionDayText(this.state.google_civic_election_id)}
                                         length={BallotStore.ballotLength}
                                         length_remaining={BallotStore.ballot_remaining_choices_length} />
                    </div>
                  </div> :
                  null }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content-container">
        <div className="container-fluid">
          {emptyBallot}
          <div className="row ballot__body">
            <div className="col-xs-12 col-md-8">
              { in_ready_to_vote_mode ?
                <div>
                  <div className="alert alert-success hidden-print">
                    <a href="#" className="close" data-dismiss="alert">&times;</a>
                    We Vote helps you get ready to vote, <strong>but you cannot use We Vote to cast your vote</strong>.
                    Make sure to return your official ballot to your polling
                    place!<br />
                    <OpenExternalWebSite url="https://help.wevote.us/hc/en-us/articles/115002401353-Can-I-cast-my-vote-with-We-Vote-"
                                         target="_blank"
                                         body={"See more information about casting your official vote."} />
                  </div>
                  <div className={isWebApp() ? "BallotList" : "BallotList__cordova"}>
                    {this.state.ballotWithAllItemsByFilterType.map( (item) => <BallotItemReadyToVote key={item.we_vote_id} {...item} />)}
                  </div>
                </div> :
                <div>
                  { this.state.ballotWithAllItemsByFilterType && this.state.ballotWithAllItemsByFilterType.length ?
                    <div className="row ballot__item-filter-tabs">
                      { BALLOT_ITEM_FILTER_TYPES.map(one_type => {
                          let allBallotItemsByFilterType = this.state.ballotWithAllItems.filter(item => {
                            if (one_type === "Measure") {
                              return item.kind_of_ballot_item === "MEASURE";
                            } else {
                              return one_type === item.race_office_level;
                            }
                          });
                          if (allBallotItemsByFilterType.length) {
                            let ballotItemsByFilterType = this.state.ballotWithAllItemsByFilterType.filter(item => {
                              if (one_type === "Measure") {
                                return item.kind_of_ballot_item === "MEASURE";
                              } else {
                                return one_type === item.race_office_level;
                              }
                            });
                            return <div className="col-6 col-sm-3 u-stack--md u-inset__h--sm" key={one_type}>
                              <Button block active={one_type === this.state.ballot_item_filter_type}
                                      onClick={() => this.setBallotItemFilterType(one_type)}>
                                {one_type}&nbsp;({ballotItemsByFilterType.length})
                              </Button>
                            </div>;
                          } else {
                            return null;
                          }
                        })
                      }
                    </div> :
                    null
                  }
                  <div className={isWebApp() ? "BallotList" : "BallotList__cordova"}>
                    { this.state.ballotWithAllItemsByFilterType.map( (item) => {
                        // console.log(this.state.ballot_item_filter_type);
                        if (this.state.ballot_item_filter_type === "All" ||
                            item.kind_of_ballot_item === "MEASURE" && this.state.ballot_item_filter_type === "Measure" ||
                            this.state.ballot_item_filter_type === item.race_office_level) {
                          return <BallotItemCompressed toggleCandidateModal={this.toggleCandidateModal}
                                                       toggleMeasureModal={this.toggleMeasureModal}
                                                       key={item.we_vote_id}
                                                       updateOfficeDisplayUnfurledTracker={this.updateOfficeDisplayUnfurledTracker}
                                                       allBallotItemsCount={this.state.ballotWithAllItemsByFilterType.length}
                                                       urlWithoutHash={this.props.location.pathname + this.props.location.search}
                                                       currentBallotIdInUrl={this.props.location.hash.slice(1)}
                                                       ref={ref => { this.ballotItems[item.we_vote_id] = ref; }}
                                                       {...item} />;
                        } else {
                          return null;
                        }
                      })
                    }
                  </div>
                </div>
              }
              {/* Show links to this candidate in the admin tools */}
              { this.state.voter && polling_location_we_vote_id_source && (this.state.voter.is_admin || this.state.voter.is_verified_volunteer) ?
                <span className="u-wrap-links hidden-print"><span>Admin:</span>
                  <OpenExternalWebSite url={ballot_returned_admin_edit_url}
                                       target="_blank"
                                       body={<span>Ballot copied from polling location "{polling_location_we_vote_id_source}"</span>} />
                </span> :
                null
              }
            </div>

            { this.state.ballotWithAllItemsByFilterType.length === 0 || isCordova() ?
              null :
              <div className="col-md-4 hidden-xs sidebar-menu">
                <BallotSideBar displayTitle displaySubtitles
                               rawUrlVariablesString={this.props.location.search}
                               ballotWithAllItemsByFilterType={this.state.ballotWithAllItemsByFilterType}
                               ballotItemLinkHasBeenClicked={this.ballotItemLinkHasBeenClicked}/>
              </div> }
          </div>
        </div>
      </div>
    </div>;
  }
}
