'use strict';
import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  background: {
    paddingBottom: 20,
    paddingTop: 30,
    paddingHorizontal: 32,
  },
  logo: {
    opacity: 0.2,
    overflow: 'visible',
    resizeMode: 'contain',
    /*
     * These negative margins allow the image to be offset similarly across screen sizes and component sizes.
     *
     * The source logo.png image is 512x512px, so as such, these margins attempt to be relative to the
     * source image's size.
     */
    marginLeft: 0,
    marginBottom: -10,
  },
  text: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkbox: {
    width: 64,
    height: 64,
  },
  icon: {
    width: 50,
    height: 50,
  },
  checkText: {
    width: 120,
    position: 'absolute',
    left: 70,
    fontSize: 20,
    fontWeight: '700',
  },
  checkText2: {
    width: 200,
    position: 'absolute',
    left: 180,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citem: {
    marginTop: 10,
  },
  buttonText: {
    fontWeight: 'bold',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: 'darkgray', //'#f3f3f3',//'#EBEBE4',
  },
  enabledButton: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    width: '50%',
  },
  smallButton: {
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    paddingVertical: 1,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 16,
    width: '50%',
  },
  settings: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'aliceblue',
  },
  buttonContainer: {
    flex: 1, // Take up the remaining space
    justifyContent: 'flex-end', // Align content to the bottom
    alignItems: 'flex-end', // Align content to the right
    flexDirection: 'row',
  },
  smallIcon: {
    width: 34,
    height: 34,
    marginBottom: 20,
    marginRight: 20,
  },
});
